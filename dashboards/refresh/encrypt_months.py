"""Encrypt monthly dashboard documents per branch for the password-protected page.

Usage: python3 encrypt_months.py cityKeys.json OUT_DIR month1.json [month2.json ...]

cityKeys.json is the `config/cityKeys` document: {"keys": {branch: public JWK (P-256)}}.
Each branch's data is sealed with ECIES: ephemeral ECDH P-256 -> HKDF-SHA256
(32 zero-byte salt, info "uaads-v1") -> AES-256-GCM. Only holders of the branch's
private key (wrapped under user passwords in the page) can read it.
Writes OUT_DIR/<YYYY-MM>.enc.json shaped like the `enc` collection documents.
"""
import base64
import json
import os
import sys

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

INFO = b"uaads-v1"


def b64u_int(s):
    s += "=" * (-len(s) % 4)
    return int.from_bytes(base64.urlsafe_b64decode(s), "big")


def b64(b):
    return base64.b64encode(b).decode()


def public_key(jwk):
    return ec.EllipticCurvePublicNumbers(b64u_int(jwk["x"]), b64u_int(jwk["y"]), ec.SECP256R1()).public_key()


def seal(pub, data):
    eph = ec.generate_private_key(ec.SECP256R1())
    shared = eph.exchange(ec.ECDH(), pub)
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=bytes(32), info=INFO).derive(shared)
    iv = os.urandom(12)
    ct = AESGCM(key).encrypt(iv, data, None)
    epk = eph.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return {"epk": b64(epk), "iv": b64(iv), "ct": b64(ct)}


def main():
    keys_path, out_dir, *docs = sys.argv[1:]
    keys = json.load(open(keys_path, encoding="utf-8"))["keys"]
    pubs = {name: public_key(jwk) for name, jwk in keys.items()}
    for path in docs:
        doc = json.load(open(path, encoding="utf-8"))
        cities, skipped = {}, []
        for branch, payload in doc["branches"].items():
            if branch not in pubs:
                skipped.append(branch)
                continue
            cities[branch] = seal(pubs[branch], json.dumps(payload, ensure_ascii=False).encode())
        out = {k: doc[k] for k in ("month", "fetchedAt", "through", "rate")}
        out["cities"] = cities
        with open(f"{out_dir}/{doc['month']}.enc.json", "w", encoding="utf-8") as f:
            json.dump(out, f)
        print(f"{doc['month']}: {len(cities)} branches sealed" + (f"; no key for: {', '.join(skipped)}" if skipped else ""))


if __name__ == "__main__":
    main()
