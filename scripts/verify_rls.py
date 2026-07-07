#!/usr/bin/env python3
"""Verificação de RLS da BLACK BELT 360 — prova as invariantes de acesso por
membership SEM Docker/Supabase local e SEM alterar produção (tudo roda numa
transação com ROLLBACK no fim).

Como funciona: as funções app.is_admin()/app.artista_id() leem os claims do JWT
(auth.jwt() -> app_metadata). Então dá pra simular qualquer usuário só setando
`request.jwt.claims` + `role authenticated` no Postgres. Inserimos linhas de
teste para dois artistas (como postgres, que bypassa RLS), trocamos de persona
e conferimos o que cada uma consegue ler.

Uso:  python scripts/verify_rls.py      (lê a senha do banco de .env.local)
Requer: psycopg (v3). Sai com código !=0 se qualquer invariante falhar.
"""
import json
import re
import sys
import uuid
import pathlib

import psycopg

TABELAS = ["demandas", "lancamentos", "clipes", "documentos"]


def cfg():
    env = pathlib.Path(__file__).resolve().parent.parent / ".env.local"
    txt = env.read_text(encoding="utf-8")
    def g(k):
        m = re.search(rf"^{k}=(.*)$", txt, re.M)
        return m.group(1).strip() if m else None
    url = g("NEXT_PUBLIC_SUPABASE_URL")
    ref = re.sub(r"^https?://", "", url).split(".")[0]
    return dict(host=f"db.{ref}.supabase.co", port=5432, user="postgres",
                password=g("SUPABASE_DB_PASSWORD"), dbname="postgres", sslmode="require")


def claims(artista_id=None, admin=False):
    meta = {}
    if admin:
        meta["role"] = "admin"
    if artista_id:
        meta["artista_id"] = str(artista_id)
    return json.dumps({"sub": str(uuid.uuid4()), "role": "authenticated", "app_metadata": meta})


def como(cur, c):
    # SET não aceita parâmetro — o JSON é controlado por nós (sem aspas simples).
    cur.execute("set local role authenticated")
    cur.execute(f"set local request.jwt.claims = '{c}'")


def como_postgres(cur):
    cur.execute("reset role")
    cur.execute("reset request.jwt.claims")


def conta(cur, tabela, artista_id):
    cur.execute(f"select count(*) from {tabela} where artista_id = %s", (str(artista_id),))
    return cur.fetchone()[0]


def main():
    falhas = []
    def check(nome, cond):
        print(f"  [{'PASS' if cond else 'FALHOU'}] {nome}")
        if not cond:
            falhas.append(nome)

    with psycopg.connect(**cfg(), connect_timeout=15) as conn:  # autocommit=False (padrão)
        with conn.cursor() as cur:
            cur.execute("select id from artistas order by created_at limit 2")
            arts = [r[0] for r in cur.fetchall()]
            if len(arts) < 2:
                print("Preciso de pelo menos 2 artistas cadastrados para testar acesso cruzado.")
                sys.exit(2)
            A, B = arts[0], arts[1]
            print(f"Artista A={A}  ·  Artista B={B}\n")

            # setup (como postgres, bypassa RLS) — inserimos 1 linha de cada tabela
            # para A e para B em cada tabela nova de RLS.
            for t in TABELAS:
                cur.execute(f"insert into {t} (artista_id, titulo) values (%s,'RLS-A'),(%s,'RLS-B')", (str(A), str(B)))

            print("Persona 1 — usuário NÃO-admin do artista A (não pode ver B):")
            como(cur, claims(artista_id=A))
            for t in TABELAS:
                check(f"{t}: A vê o próprio (>=1)", conta(cur, t, A) >= 1)
                check(f"{t}: A NÃO vê B (==0)", conta(cur, t, B) == 0)

            como_postgres(cur)
            print("\nPersona 2 — usuário autenticado SEM artista e não-admin (não vê nada de B):")
            como(cur, claims())
            for t in TABELAS:
                check(f"{t}: estranho NÃO vê B (==0)", conta(cur, t, B) == 0)

            como_postgres(cur)
            print("\nPersona 3 — admin (vê tudo, inclusive B):")
            como(cur, claims(admin=True))
            for t in TABELAS:
                check(f"{t}: admin vê B (>=1)", conta(cur, t, B) >= 1)

            como_postgres(cur)
        conn.rollback()  # nada persiste em produção

    print()
    if falhas:
        print(f"FALHOU: {len(falhas)} invariante(s) de RLS quebrada(s): {falhas}")
        sys.exit(1)
    print("OK — todas as invariantes de RLS por membership passaram (rollback aplicado).")


if __name__ == "__main__":
    main()
