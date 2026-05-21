"""
03_embed.py

Reads data/interim/nuforc_clean.parquet and produces sentence-transformer
embeddings for every narrative. Writes embeddings to
data/embeddings/nuforc_embeddings.parquet.

Model: sentence-transformers/all-MiniLM-L6-v2 (384-dim, ~80MB, CPU-friendly).

This is cache-aware: if the output file exists and covers every source_id
in the cleaned data, the script exits immediately. To force re-embedding,
delete the output file or pass --force.

On a modern laptop CPU, expect ~20-30 minutes for 70K narratives. On a
machine with a CUDA GPU it will be 2-3 minutes.

Outputs:
  data/embeddings/nuforc_embeddings.parquet
    Columns: source_id, embedding (list[float32, 384])
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from tqdm import tqdm

ROOT = Path(__file__).resolve().parent.parent
IN_PATH = ROOT / "data" / "interim" / "nuforc_clean.parquet"
OUT_PATH = ROOT / "data" / "embeddings" / "nuforc_embeddings.parquet"

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBED_DIM = 384
BATCH_SIZE = 64
MAX_CHARS = 2000  # truncate very long narratives; the model max is 256 tokens anyway


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Re-embed even if cached")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--device", default=None, help="cpu, cuda, mps (autodetect if None)")
    args = parser.parse_args()

    if not IN_PATH.exists():
        sys.exit(f"Input not found: {IN_PATH}\nRun 02_clean.py first.")

    print(f"Reading {IN_PATH}...")
    df = pd.read_parquet(IN_PATH, columns=["source_id", "narrative"])
    print(f"  {len(df):,} narratives to embed")

    # Cache check
    if OUT_PATH.exists() and not args.force:
        existing = pd.read_parquet(OUT_PATH, columns=["source_id"])
        missing = set(df["source_id"]) - set(existing["source_id"])
        if not missing:
            print(f"All {len(existing):,} embeddings already cached. Use --force to redo.")
            return
        print(f"  cache hit on {len(existing):,} rows; {len(missing):,} remain to embed")
        df = df[df["source_id"].isin(missing)].copy()

    # Lazy import so the script is at least introspectable without torch installed
    print(f"Loading model {MODEL_NAME}...")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME, device=args.device)
    print(f"  model loaded on device: {model.device}")

    # Truncate narratives that are absurdly long, just to keep tokenization sane
    texts = df["narrative"].str.slice(0, MAX_CHARS).tolist()
    ids = df["source_id"].tolist()

    print(f"Embedding {len(texts):,} narratives (batch_size={args.batch_size})...")
    embeddings = np.zeros((len(texts), EMBED_DIM), dtype=np.float32)
    for i in tqdm(range(0, len(texts), args.batch_size)):
        batch = texts[i : i + args.batch_size]
        out = model.encode(
            batch,
            batch_size=args.batch_size,
            convert_to_numpy=True,
            normalize_embeddings=True,  # for cosine sim later
            show_progress_bar=False,
        )
        embeddings[i : i + len(batch)] = out

    new_df = pd.DataFrame({
        "source_id": ids,
        "embedding": list(embeddings),  # store as list of arrays
    })

    # Merge with any existing cache
    if OUT_PATH.exists() and not args.force:
        existing = pd.read_parquet(OUT_PATH)
        combined = pd.concat([existing, new_df], ignore_index=True)
        combined = combined.drop_duplicates("source_id", keep="last")
    else:
        combined = new_df

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    combined.to_parquet(OUT_PATH, index=False)
    print(f"Wrote {OUT_PATH} ({len(combined):,} embeddings)")

    # Sanity check: norms should be ~1.0 since we normalized
    norms = np.linalg.norm(np.stack(combined["embedding"].head(100).to_list()), axis=1)
    print(f"  sample norm stats: mean={norms.mean():.4f}, std={norms.std():.4f}")


if __name__ == "__main__":
    main()
