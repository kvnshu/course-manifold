from sentence_transformers import SentenceTransformer
import pandas as pd
from pathlib import Path
import umap

def gen_embeddings(df):
    model = SentenceTransformer("all-mpnet-base-v2")
    embeddings_file = Path("course_embeddings.csv")
    if embeddings_file.exists():
        embeddings = pd.read_csv(embeddings_file, index_col=0).values
    else:
        embeddings = model.encode(df['course_description'].tolist())
        pd.DataFrame(embeddings).to_csv(embeddings_file)
    embedding_cols = [f'embedding_{dim}' for dim in range(embeddings.shape[1])]
    df_embeddings = pd.concat(
        [df, pd.DataFrame(embeddings, columns=embedding_cols, index=df.index)], axis=1)
    return df_embeddings

def umap_all(embeddings, n_neighbors):
    umap_model_3d = umap.UMAP(n_components=3, random_state=42, n_neighbors=n_neighbors)
    embeddings_umap_3d = umap_model_3d.fit_transform(embeddings)
    return embeddings_umap_3d

def gen_pts(df_embeddings):
    umap_model_3d = umap.UMAP(n_components=3, random_state=42, n_neighbors=32)
    embedding_cols = [c for c in df_embeddings.columns if c.startswith('embedding_')]
    embeddings_subset = df_embeddings[embedding_cols].values
    embeddings_umap_3d = umap_model_3d.fit_transform(embeddings_subset)
    df_points = df_embeddings[['course_subj', 'course_number', 'course_name', 'course_description']].copy()
    df_points['x'] = embeddings_umap_3d[:, 0]
    df_points['y'] = embeddings_umap_3d[:, 1]
    df_points['z'] = embeddings_umap_3d[:, 2]
    return df_points

filename = Path("courses.csv")
df = pd.read_csv(filename)
df['course_number'] = df['course_number'].astype(str)
df_embeddings = gen_embeddings(df)
df_points = gen_pts(df_embeddings)
output_path = Path("../app/public/course_points.json")
df_points.to_json(output_path, orient="records", lines=False)

