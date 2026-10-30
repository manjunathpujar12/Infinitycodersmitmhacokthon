
#!/usr/bin/env python3
"""
HireSense AI synthetic recruitment dataset generator.

Creates linked synthetic recruitment data, synthetic PDF resumes, CSV + JSON exports,
validation reports, and an optional adapter for a downloaded public resume dataset.

Example:
  pip install pandas numpy Faker reportlab
  python generate_dataset.py --candidates 500 --seed 42
  python generate_dataset.py --candidates 500 --public-resume-file public_data/master_resumes.jsonl

Public resume files are NOT downloaded automatically. Download them from their official
dataset page, review their current license/terms, then pass the local file path.
"""
from __future__ import annotations
import argparse, json, random, re, csv
from pathlib import Path
from datetime import date, datetime, timedelta, time
from typing import Any
import numpy as np
import pandas as pd
from faker import Faker
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm

ROLES = [
    ("Python Developer", ["Python","SQL","Flask"], ["FastAPI","Pandas","Git"], ["Python","SQL","Flask","FastAPI","Pandas","Git"]),
    ("Java Developer", ["Java","SQL","Spring Boot"], ["REST API","Git","Docker"], ["Java","SQL","Spring Boot","REST API","Git","Docker"]),
    ("Frontend Developer", ["HTML","CSS","JavaScript","React"], ["TypeScript","Tailwind CSS","Git"], ["HTML","CSS","JavaScript","React","TypeScript","Tailwind CSS","Git"]),
    ("Data Analyst", ["SQL","Excel","Python"], ["Power BI","Tableau","Pandas"], ["SQL","Excel","Python","Power BI","Tableau","Pandas"]),
    ("Machine Learning Engineer", ["Python","Machine Learning","Pandas"], ["Scikit-learn","TensorFlow","SQL"], ["Python","Machine Learning","Pandas","Scikit-learn","TensorFlow","SQL"]),
    ("QA Engineer", ["Manual Testing","SQL","Test Cases"], ["Selenium","Python","API Testing"], ["Manual Testing","SQL","Test Cases","Selenium","Python","API Testing"]),
    ("Full Stack Developer", ["JavaScript","React","Node.js"], ["SQL","Express","Git"], ["JavaScript","React","Node.js","SQL","Express","Git"]),
    ("Data Engineer", ["Python","SQL","ETL"], ["Airflow","Spark","Cloud"], ["Python","SQL","ETL","Airflow","Spark","Cloud"]),
]
ALL_SKILLS = sorted(set(s for r in ROLES for s in r[3]) | {"C","C++","MongoDB","PostgreSQL","AWS","Azure","Linux","Communication","Problem Solving","Agile","REST API","NumPy"})
CITIES = ["Mysore","Bengaluru","Hyderabad","Chennai","Pune","Mumbai","Delhi","Kochi"]
DEGREES = ["B.E. Computer Science","B.Tech Information Technology","BCA","MCA","M.Sc Computer Science","B.E. Information Science"]
COLLEGES = ["Sample Institute of Technology","National College of Engineering","City Institute of Science","University Engineering College","Regional Institute of Technology"]
FRESHER_SHARE = 0.62
BASE_DATE = date(2026, 10, 1)

def dump_json(records, path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False, default=str)

def write_table(df, out_dir, name):
    df.to_csv(out_dir/f"{name}.csv", index=False, encoding="utf-8")
    df.to_json(out_dir/f"{name}.json", orient="records", indent=2, force_ascii=False)

def normalize_skills(value):
    if isinstance(value, list): vals = value
    elif isinstance(value, str): vals = re.split(r"[,;|]", value)
    else: vals = []
    return sorted({str(x).strip() for x in vals if str(x).strip() and str(x).lower() != "nan"})

def import_public_resumes(file_path, out_dir):
    """Normalize downloaded public resume data from JSONL, JSON or CSV."""
    p = Path(file_path)
    if not p.exists():
        raise FileNotFoundError(f"Public resume file not found: {p}")
    rows = []
    if p.suffix.lower() in [".jsonl", ".ndjson"]:
        with p.open(encoding="utf-8") as f:
            raw = [json.loads(line) for line in f if line.strip()]
    elif p.suffix.lower() == ".json":
        raw_obj = json.loads(p.read_text(encoding="utf-8"))
        raw = raw_obj if isinstance(raw_obj, list) else raw_obj.get("data", [])
    elif p.suffix.lower() == ".csv":
        raw = pd.read_csv(p).fillna("").to_dict("records")
    else:
        raise ValueError("Supported public resume formats: .jsonl, .json, .csv")
    for i, item in enumerate(raw, 1):
        # Supports common nested schema and Resume_str-style columns.
        personal = item.get("personal_info", {}) if isinstance(item.get("personal_info"), dict) else {}
        skills_obj = item.get("skills", {})
        skill_names = []
        if isinstance(skills_obj, dict):
            for val in skills_obj.values():
                if isinstance(val, list):
                    for x in val:
                        skill_names.append(x.get("name","") if isinstance(x,dict) else str(x))
                elif isinstance(val, str): skill_names += normalize_skills(val)
        elif isinstance(skills_obj, list): skill_names += [x.get("name","") if isinstance(x,dict) else str(x) for x in skills_obj]
        text = item.get("resume_text") or item.get("Resume_str") or item.get("text") or item.get("summary") or ""
        if not text and isinstance(item.get("experience"), list):
            text = " ".join(str(x.get("title","")) + " " + str(x.get("description","")) for x in item["experience"] if isinstance(x,dict))
        category = item.get("Category") or item.get("category") or item.get("job_title") or ""
        rows.append({
            "public_resume_id": f"PUB{i:05d}",
            "source_dataset": p.name,
            "source_record_id": str(item.get("id", item.get("ID", i))),
            "category": str(category),
            "resume_text": str(text)[:12000],
            "skills": normalize_skills(skill_names),
            "provenance": "Imported from user-supplied public dataset; verify upstream terms",
            "license_review_required": True
        })
    df = pd.DataFrame(rows)
    df.to_csv(out_dir/"public_resumes.csv", index=False, encoding="utf-8")
    dump_json(rows, out_dir/"public_resumes.json")
    return len(rows)

def make_pdf(candidate, path):
    styles = getSampleStyleSheet()
    title = ParagraphStyle("ResumeTitle", parent=styles["Title"], fontSize=17, leading=20, spaceAfter=6)
    small = ParagraphStyle("Small", parent=styles["BodyText"], fontSize=9, leading=12)
    story = [Paragraph(candidate["full_name"], title),
             Paragraph(f'{candidate["email"]} | {candidate["phone"]} | {candidate["current_location"]}', small),
             Spacer(1, 8),
             Paragraph("PROFESSIONAL SUMMARY", styles["Heading2"]),
             Paragraph(candidate["summary"], small), Spacer(1, 5),
             Paragraph("EDUCATION", styles["Heading2"]),
             Paragraph(f'{candidate["degree"]} — {candidate["college"]} ({candidate["graduation_year"]})', small),
             Spacer(1, 5), Paragraph("SKILLS", styles["Heading2"]),
             Paragraph(", ".join(candidate["skills"]), small), Spacer(1, 5),
             Paragraph("PROJECTS", styles["Heading2"])]
    for proj in candidate["projects"]:
        story += [Paragraph(f'<b>{proj["name"]}</b> — {proj["description"]}', small),
                  Paragraph(f'Technologies: {", ".join(proj["technologies"])}', small), Spacer(1, 3)]
    story += [Spacer(1, 5), Paragraph("EXPERIENCE", styles["Heading2"]),
              Paragraph(candidate["experience_summary"], small),
              Spacer(1, 5), Paragraph("NOTE", styles["Heading2"]),
              Paragraph("Synthetic demonstration resume. This document does not represent a real person.", small)]
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=17*mm, leftMargin=17*mm, topMargin=15*mm, bottomMargin=15*mm)
    doc.build(story)

def generate(args):
    random.seed(args.seed); np.random.seed(args.seed)
    fake = Faker("en_IN"); Faker.seed(args.seed)
    root = Path(args.output); ds = root/"datasets"; syn_pdf = root/"resumes"/"synthetic"
    ds.mkdir(parents=True, exist_ok=True); syn_pdf.mkdir(parents=True, exist_ok=True)
    for old in syn_pdf.glob("*.pdf"): old.unlink()

    # Skill taxonomy seeded from O*NET-style occupational categories; enrich/replace using downloaded O*NET files.
    taxonomy = []
    for role, required, optional, all_role_skills in ROLES:
        for skill in all_role_skills:
            taxonomy.append({"skill_id": f"SK{len(taxonomy)+1:04d}", "skill_name": skill, "occupation": role,
                             "skill_type": "core" if skill in required else "additional",
                             "source": "Prototype taxonomy informed by role descriptions; replace/enrich with O*NET"})
    taxonomy_df = pd.DataFrame(taxonomy).drop_duplicates(subset=["skill_name","occupation"])
    write_table(taxonomy_df, ds, "skill_taxonomy")

    jobs=[]
    for j in range(1, 21):
        role, required, optional, role_skills = ROLES[(j-1)%len(ROLES)]
        loc = CITIES[(j-1)%5]
        exp = "Fresher" if j%3 != 0 else "1-3 years"
        jobs.append({"job_id":f"JOB{j:03d}", "job_role":role, "required_skills":required,
                     "optional_skills":optional, "experience_required":exp,
                     "minimum_qualification":random.choice(DEGREES), "location":loc,
                     "vacancies":random.randint(5,25), "status":"Open",
                     "description":f"Seeking a {role} to contribute to software and data projects. Required skills: {', '.join(required)}. Additional skills: {', '.join(optional)}."})
    jobs_df=pd.DataFrame(jobs)
    jobs_export=jobs_df.copy()
    for c in ["required_skills","optional_skills"]: jobs_export[c]=jobs_export[c].apply(lambda x:";".join(x))
    write_table(jobs_export, ds, "jobs")

    candidates=[]; prefs=[]; applications=[]; resume_json=[]
    for i in range(1,args.candidates+1):
        role, req, opt, role_skills = random.choice(ROLES)
        is_fresher = random.random() < FRESHER_SHARE
        skill_count=random.randint(3,6)
        skills=random.sample(role_skills, min(skill_count,len(role_skills)))
        if random.random()<0.25: skills += random.sample(ALL_SKILLS,2)
        skills=sorted(set(skills))
        cid=f"CAND{i:04d}"
        city=random.choice(CITIES)
        preferred=random.sample(CITIES, k=random.randint(1,3))
        exp_years=0 if is_fresher else random.choice([1,2,3,4,5])
        exp_label="Fresher" if is_fresher else f"{exp_years} years"
        reg_date=BASE_DATE+timedelta(days=random.randint(0,45))
        degree=random.choice(DEGREES)
        projects=[{"name":f"{role.split()[0]} Project {n}", "description":f"Built a prototype solution using {', '.join(random.sample(skills,min(2,len(skills))))}.", "technologies":random.sample(skills,min(3,len(skills)))} for n in range(1,random.randint(2,3))]
        candidate={"candidate_id":cid,"full_name":fake.name(),"email":f"{cid.lower()}@example.test","phone":f"+91-90000{random.randint(10000,99999)}",
                   "education":degree,"degree":degree,"college":random.choice(COLLEGES),"graduation_year":random.randint(2021,2026),
                   "experience_level":exp_label,"experience_years":exp_years,"skills":skills,"current_location":city,
                   "relocation_willing":random.choice([True,True,False]),"registration_date":reg_date.isoformat(),
                   "resume_path":f"resumes/synthetic/{cid}.pdf","summary":f"{exp_label} {role} candidate with interest in software development and practical projects involving {', '.join(skills[:3])}.",
                   "projects":projects,"experience_summary":"Fresher: academic projects and internships." if is_fresher else f"{exp_years} years of illustrative software experience. Synthetic experience record."}
        candidates.append({k:v for k,v in candidate.items() if k not in ["projects","summary","experience_summary"]})
        resume_json.append(candidate)
        for p,loc in enumerate(preferred,1):
            prefs.append({"preference_id":f"PREF{i:04d}_{p}","candidate_id":cid,"preferred_location":loc,"priority":p})
        # one or two job applications; job selection partially role-related
        job_candidates=jobs_df[jobs_df.job_role==role].job_id.tolist() or jobs_df.job_id.tolist()
        chosen=[random.choice(job_candidates)]
        if random.random()<0.25: chosen.append(random.choice(jobs_df.job_id.tolist()))
        for ji,jid in enumerate(set(chosen),1):
            applications.append({"application_id":f"APP{i:04d}_{ji}","candidate_id":cid,"job_id":jid,
                                 "applied_date":reg_date.isoformat(),"application_status":random.choice(["Applied","Under Review","Shortlisted","Interview Scheduled"]),
                                 "source_channel":random.choice(["Company Website","Job Portal","Campus Drive","Referral"])})

    candidates_df=pd.DataFrame(candidates)
    candidates_export=candidates_df.copy(); candidates_export["skills"]=candidates_export.skills.apply(lambda x:";".join(x))
    write_table(candidates_export,ds,"candidates")
    prefs_df=pd.DataFrame(prefs); write_table(prefs_df,ds,"location_preferences")
    apps_df=pd.DataFrame(applications); write_table(apps_df,ds,"applications")

    # Recruitment events
    events=[]
    for i in range(1,11):
        events.append({"event_id":f"EVT{i:03d}","event_name":f"{CITIES[(i-1)%len(CITIES)]} Technical Hiring Drive {i}",
                       "location":CITIES[(i-1)%len(CITIES)],"event_date":(BASE_DATE+timedelta(days=30+i*7)).isoformat(),
                       "registration_deadline":(BASE_DATE+timedelta(days=20+i*7)).isoformat(),
                       "status":"Planned","capacity":random.randint(60,140)})
    events_df=pd.DataFrame(events); write_table(events_df,ds,"recruitment_events")

    # Interview slots, bookings and attendance
    slots=[]; interviews=[]; attendance=[]; outcomes=[]
    slot_counter=0; interview_counter=0
    candidate_ids=[c["candidate_id"] for c in candidates]
    for ev in events:
        for day_offset in range(3):
            d=date.fromisoformat(ev["event_date"])+timedelta(days=day_offset)
            for hour in [9,10,11,12,14,15,16]:
                slot_counter+=1
                cap=random.randint(4,10)
                slots.append({"slot_id":f"SLOT{slot_counter:04d}","event_id":ev["event_id"],"location":ev["location"],
                              "interview_date":d.isoformat(),"start_time":f"{hour:02d}:00","end_time":f"{hour:02d}:30",
                              "capacity":cap,"booked_count":0,"status":"Available"})
    slots_df=pd.DataFrame(slots)
    # Allocate up to candidate count; deliberately keep some overflow/waitlist records.
    for idx,c in enumerate(candidates):
        if random.random()<0.92:
            available=slots_df[slots_df.booked_count < slots_df.capacity]
            if len(available)==0: break
            slot_idx=random.choice(available.index.tolist())
            slot=slots_df.loc[slot_idx]
            interview_counter+=1
            status=random.choices(["Scheduled","Cancelled","Waitlisted"],weights=[0.88,0.05,0.07])[0]
            interviews.append({"interview_id":f"INT{interview_counter:05d}","candidate_id":c["candidate_id"],
                               "job_id":random.choice(jobs_df.job_id.tolist()),"event_id":slot.event_id,"slot_id":slot.slot_id,
                               "scheduled_date":slot.interview_date,"scheduled_time":slot.start_time,
                               "interview_mode":random.choice(["In-person","Online"]),"booking_status":status})
            if status=="Scheduled":
                slots_df.loc[slot_idx,"booked_count"]+=1
                att_status=random.choices(["Attended","Absent","Rescheduled"],weights=[0.76,0.16,0.08])[0]
                reason=random.choice(["Medical emergency","Travel disruption","Personal emergency","No response","Other"]) if att_status=="Absent" else ""
                exp=c["experience_level"]!="Fresher"
                justification="Not Required" if att_status!="Absent" or not exp else random.choice(["Pending","Submitted","Rejected"])
                attendance.append({"attendance_id":f"ATT{interview_counter:05d}","interview_id":f"INT{interview_counter:05d}",
                                   "candidate_id":c["candidate_id"],"experience_level":c["experience_level"],
                                   "attendance_status":att_status,"absence_reason":reason,
                                   "justification_status":justification,
                                   "policy_action":("Opportunity Lost" if att_status=="Absent" and c["experience_level"]=="Fresher" else
                                                    ("Review Justification" if att_status=="Absent" and c["experience_level"]!="Fresher" else
                                                     ("Continue Process" if att_status=="Attended" else "Reschedule Review"))),
                                   "recorded_by":"HR_ADMIN_01"})
                result=random.choice(["Passed","Failed","Pending"]) if att_status=="Attended" else "Not Evaluated"
                outcomes.append({"outcome_id":f"OUT{interview_counter:05d}","interview_id":f"INT{interview_counter:05d}",
                                 "candidate_id":c["candidate_id"],"job_id":interviews[-1]["job_id"],
                                 "interview_result":result,"final_status":("Selected" if result=="Passed" and random.random()<0.35 else ("In Progress" if result=="Pending" else ("Not Selected" if result=="Failed" else "Not Evaluated")))})
    write_table(slots_df,ds,"interview_slots")
    interviews_df=pd.DataFrame(interviews); write_table(interviews_df,ds,"interviews")
    attendance_df=pd.DataFrame(attendance); write_table(attendance_df,ds,"attendance")
    outcomes_df=pd.DataFrame(outcomes); write_table(outcomes_df,ds,"hiring_outcomes")

    # Synthetic resume JSON and PDFs
    dump_json(resume_json, ds/"synthetic_resume_records.json")
    for c in resume_json:
        make_pdf(c, root/c["resume_path"])

    # Public resume import schema + status. Actual public records are imported when file supplied.
    (root/"public_data"/"public_resume_import_template.csv").write_text(
        "resume_id,resume_text,category,skills,source_dataset,source_record_id,license_reviewed\n"
        "PUB00001,\"Example public resume text only\",Information-Technology,\"Python;SQL\",dataset_name,record_1,false\n",
        encoding="utf-8")
    public_count=0
    if args.public_resume_file:
        public_count=import_public_resumes(args.public_resume_file, ds)
    else:
        dump_json([], ds/"public_resumes.json")
        pd.DataFrame(columns=["public_resume_id","source_dataset","source_record_id","category","resume_text","skills","provenance","license_review_required"]).to_csv(ds/"public_resumes.csv",index=False)

    # Data quality validation
    checks=[]
    def check(name, condition, detail):
        checks.append({"check":name,"passed":bool(condition),"detail":detail})
    check("Unique candidate IDs",candidates_df.candidate_id.is_unique,"Candidate IDs must be unique")
    check("Unique job IDs",jobs_df.job_id.is_unique,"Job IDs must be unique")
    check("All preference candidate IDs valid",set(prefs_df.candidate_id).issubset(set(candidates_df.candidate_id)),"Preferences reference existing candidates")
    check("All application candidate IDs valid",set(apps_df.candidate_id).issubset(set(candidates_df.candidate_id)),"Applications reference existing candidates")
    check("All application job IDs valid",set(apps_df.job_id).issubset(set(jobs_df.job_id)),"Applications reference existing jobs")
    check("All interview candidate IDs valid",set(interviews_df.candidate_id).issubset(set(candidates_df.candidate_id)),"Interviews reference existing candidates")
    check("All interview slots valid",set(interviews_df.slot_id).issubset(set(slots_df.slot_id)),"Interviews reference existing slots")
    check("No slot over capacity",bool((slots_df.booked_count<=slots_df.capacity).all()),"Booked count never exceeds capacity")
    check("Attendance interview IDs valid",set(attendance_df.interview_id).issubset(set(interviews_df.interview_id)),"Attendance references existing interviews")
    check("Outcome interview IDs valid",set(outcomes_df.interview_id).issubset(set(interviews_df.interview_id)),"Outcomes reference existing interviews")
    check("PDF resumes created",len(list(syn_pdf.glob("*.pdf")))==len(candidates),"One synthetic PDF per candidate")
    validation={"generated_at":datetime.now().isoformat(timespec="seconds"),"seed":args.seed,"candidate_count":len(candidates),
                "public_resume_count":public_count,"synthetic_pdf_count":len(list(syn_pdf.glob("*.pdf"))),
                "checks":checks,"all_passed":all(x["passed"] for x in checks)}
    dump_json(validation,root/"validation_report.json")

    # Readme and provenance
    readme=f"""# HireSense AI Dataset Package

## Generated contents
- {len(candidates)} synthetic candidate records
- {len(jobs)} prototype job descriptions
- {len(prefs)} candidate-location preference rows
- {len(events)} recruitment events
- {len(slots_df)} interview slots
- {len(interviews_df)} interview bookings
- {len(attendance_df)} attendance records
- {len(outcomes_df)} hiring outcome records
- {len(list(syn_pdf.glob('*.pdf')))} synthetic PDF resumes
- {public_count} imported public resume records

## Run
```bash
pip install pandas numpy Faker reportlab
python generate_dataset.py --candidates 500 --seed 42
```
To import a public resume dataset after downloading it:
```bash
python generate_dataset.py --candidates 500 --seed 42 --public-resume-file public_data/master_resumes.jsonl
```
Supported public file formats: JSONL, JSON, CSV. The importer normalizes common nested resume JSON fields and Resume_str-style CSV fields.

## Public resume source options
1. datasetmaster/resumes: https://huggingface.co/datasets/datasetmaster/resumes
   Its dataset card describes a merged collection of real and synthetic resume data and states MIT license. Review the live card, source provenance and terms before using.
2. opensporks/resumes: https://huggingface.co/datasets/opensporks/resumes
   Its card lists CC0-1.0 and describes resume examples scraped from LiveCareer. Review provenance and terms before use.

Public resume data is not bundled by default. Download it yourself from the dataset's official page and pass the local path to the importer. This package therefore does not redistribute third-party resume records. Synthetic PDF resumes are included for all synthetic candidates.

## O*NET occupational skills integration
Download the O*NET database from https://www.onetcenter.org/database.html. Use occupation, skills, knowledge and technology skills tables to enrich `skill_taxonomy.csv`. Keep source/version/license columns when merging. O*NET describes US occupations; adapt role names and validate skills against Indian job postings and HR feedback.

## Important data notes
- All candidate names, emails, phone numbers, institutions, records, dates, interviews and outcomes generated by this script are synthetic placeholders.
- `example.test` email domain is reserved for testing.
- The job descriptions are prototype examples, not actual Excelsoft vacancies.
- Attendance percentages and outcomes are simulation assumptions, not company statistics.
- AI match scores should support HR review, not automatically reject applicants.
- Do not use protected attributes or proxy variables for candidate ranking.
- Validate the workflow with HR professionals before production use.

## Relationships
- candidates.candidate_id -> location_preferences.candidate_id
- candidates.candidate_id -> applications.candidate_id
- jobs.job_id -> applications.job_id
- recruitment_events.event_id -> interview_slots.event_id
- interview_slots.slot_id -> interviews.slot_id
- candidates.candidate_id -> interviews.candidate_id
- interviews.interview_id -> attendance.interview_id and hiring_outcomes.interview_id
"""
    (root/"README.md").write_text(readme,encoding="utf-8")
    return validation

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--candidates",type=int,default=500)
    parser.add_argument("--seed",type=int,default=42)
    parser.add_argument("--output",default="HireSense_AI_Output")
    parser.add_argument("--public-resume-file",default=None)
    args=parser.parse_args()
    if args.candidates<1: raise SystemExit("--candidates must be >= 1")
    report=generate(args)
    print(json.dumps(report,indent=2))
    if not report["all_passed"]: raise SystemExit("Validation failed; inspect validation_report.json")

if __name__=="__main__":
    main()
