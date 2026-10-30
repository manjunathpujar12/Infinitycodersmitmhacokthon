
#!/usr/bin/env python3
"""Optional O*NET tab-delimited export adapter.

Example:
 python integrate_onet_skills.py --skills-file "Skills.txt" --technology-file "Technology Skills.txt" --output-dir ../datasets/onet
"""
import argparse
from pathlib import Path
import pandas as pd

def read_table(path):
    # O*NET database text files are commonly tab-delimited.
    return pd.read_csv(path, sep="\t", dtype=str, encoding="utf-8", on_bad_lines="skip").fillna("")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--skills-file", required=True)
    ap.add_argument("--technology-file", default=None)
    ap.add_argument("--output-dir", default="../datasets/onet")
    args=ap.parse_args()
    out=Path(args.output_dir); out.mkdir(parents=True, exist_ok=True)
    frames=[]
    skills=read_table(args.skills_file)
    # Standard O*NET Skills.txt includes O*NET-SOC Code and Element Name.
    if "Element Name" in skills.columns:
        s=skills[["O*NET-SOC Code","Element Name"]].drop_duplicates().copy()
        s.columns=["occupation_code","skill_name"]
        s["source_table"]="O*NET Skills"
        frames.append(s)
    if args.technology_file:
        tech=read_table(args.technology_file)
        # Technology Skills table versions may use Commodity Title / Example.
        title_col=next((c for c in ["Commodity Title","Example","Technology Skill"] if c in tech.columns), None)
        if title_col:
            t=tech[["O*NET-SOC Code",title_col]].drop_duplicates().copy()
            t.columns=["occupation_code","skill_name"]
            t["source_table"]="O*NET Technology Skills"
            frames.append(t)
    if not frames:
        raise SystemExit("Could not find expected O*NET skill columns. Inspect your downloaded file headers.")
    result=pd.concat(frames,ignore_index=True).drop_duplicates()
    result.to_csv(out/"onet_skill_taxonomy.csv",index=False)
    result.to_json(out/"onet_skill_taxonomy.json",orient="records",indent=2)
    print(f"Exported {len(result)} occupation-skill rows to {out}")

if __name__=="__main__":
    main()
