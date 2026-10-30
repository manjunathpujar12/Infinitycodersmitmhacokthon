# Public resume and occupational-skill data guide

## Public resume options
- datasetmaster/resumes: https://huggingface.co/datasets/datasetmaster/resumes
  The dataset card describes a mixed real/synthetic resume collection and states MIT. Inspect the current card, data provenance, license, and usage conditions before use.
- opensporks/resumes: https://huggingface.co/datasets/opensporks/resumes
  The dataset card lists CC0-1.0 and describes examples scraped from LiveCareer. Inspect provenance and current terms before use.

Download a file from the dataset page and keep the original source file in this folder. Then run:
`python scripts/generate_dataset.py --candidates 500 --public-resume-file public_data/your_downloaded_file.jsonl`

The generator creates `datasets/public_resumes.csv` and `.json`. Public resumes are not bundled in this package because the third-party source file was not downloaded and redistribution rights should be checked by the team first.

## O*NET skills
Download the O*NET database from https://www.onetcenter.org/database.html and extract `Skills.txt` and optionally `Technology Skills.txt`.
Then run:
`python scripts/integrate_onet_skills.py --skills-file "path/to/Skills.txt" --technology-file "path/to/Technology Skills.txt" --output-dir datasets/onet`

O*NET is a US occupational taxonomy. Use it as a starting point, then validate role names and skill requirements against Indian job descriptions and HR feedback.
