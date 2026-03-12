"""Dynamic Offers, Jobs, and Scholarships API routes."""

from fastapi import APIRouter

router = APIRouter(tags=["opportunities"])

# --- Rich mock data for hackathon demo ---

OFFERS = [
    {
        "id": 1,
        "title": "20% Off Movie Tickets",
        "description": "Enjoy the latest blockbusters at a discount with your student ID.",
        "provider": "BookMyShow",
        "discount": "20%",
        "expiry_date": "2026-12-31",
        "image_url": "https://img.icons8.com/color/96/movie-projector.png",
        "redirect_url": "https://in.bookmyshow.com/offers"
    },
    {
        "id": 2,
        "title": "Free Delivery + 15% Off",
        "description": "Save on your daily meals with Zomato Student plan.",
        "provider": "Zomato Student",
        "discount": "15%",
        "expiry_date": "2026-06-30",
        "image_url": "https://img.icons8.com/color/96/meal.png",
        "redirect_url": "https://www.zomato.com/student"
    },
    {
        "id": 3,
        "title": "GitHub Pro Free for Students",
        "description": "Get GitHub Pro, Copilot, and 50+ developer tools free for 1 year.",
        "provider": "GitHub Education",
        "discount": "100%",
        "expiry_date": "2027-01-01",
        "image_url": "https://img.icons8.com/color/96/github.png",
        "redirect_url": "https://education.github.com/pack"
    },
    {
        "id": 4,
        "title": "50% Off LinkedIn Learning",
        "description": "Access 16,000+ courses on business, tech, and creative skills.",
        "provider": "LinkedIn",
        "discount": "50%",
        "expiry_date": "2026-09-30",
        "image_url": "https://img.icons8.com/color/96/linkedin.png",
        "redirect_url": "https://www.linkedin.com/learning/"
    },
    {
        "id": 5,
        "title": "Flat ₹100 off on Bus Tickets",
        "description": "Travel smart with discounted intercity bus tickets.",
        "provider": "RedBus",
        "discount": "₹100",
        "expiry_date": "2026-08-15",
        "image_url": "https://img.icons8.com/color/96/bus.png",
        "redirect_url": "https://www.redbus.in/offers"
    }
]

JOBS = [
    {
        "id": 1,
        "job_title": "Campus Cafe Assistant",
        "company_name": "Campus Cafe",
        "location": "Mangalore",
        "salary_estimate": "₹8,000/month",
        "job_type": "Part-Time",
        "apply_url": "https://www.internshala.com"
    },
    {
        "id": 2,
        "job_title": "Freelance UI Designer",
        "company_name": "DesignCraft Studio",
        "location": "Remote",
        "salary_estimate": "₹15,000/project",
        "job_type": "Freelance",
        "apply_url": "https://www.freelancer.in"
    },
    {
        "id": 3,
        "job_title": "Campus Ambassador",
        "company_name": "Unstop",
        "location": "Remote / Campus",
        "salary_estimate": "₹5,000/month + Perks",
        "job_type": "Part-Time",
        "apply_url": "https://unstop.com/campus-ambassador"
    },
    {
        "id": 4,
        "job_title": "Content Writer Intern",
        "company_name": "Medium India",
        "location": "Remote",
        "salary_estimate": "₹10,000/month",
        "job_type": "Internship",
        "apply_url": "https://www.internshala.com"
    }
]

SCHOLARSHIPS = [
    {
        "id": 1,
        "scholarship_name": "National Merit Scholarship",
        "provider": "Government of India",
        "eligibility": "Meritorious students with family income < ₹8 LPA",
        "deadline": "2026-11-30",
        "apply_url": "https://scholarships.gov.in"
    },
    {
        "id": 2,
        "scholarship_name": "Women in Tech Scholarship",
        "provider": "Google",
        "eligibility": "Female students pursuing CS/IT degrees",
        "deadline": "2026-09-15",
        "apply_url": "https://buildyourfuture.withgoogle.com/scholarships"
    },
    {
        "id": 3,
        "scholarship_name": "Inspire Scholarship",
        "provider": "DST India",
        "eligibility": "Top 1% students in Class 12 Board Exams",
        "deadline": "2026-10-31",
        "apply_url": "https://online-inspire.gov.in"
    },
    {
        "id": 4,
        "scholarship_name": "Pragati Scholarship for Girls",
        "provider": "AICTE",
        "eligibility": "Girls admitted to AICTE-approved institutions",
        "deadline": "2026-12-15",
        "apply_url": "https://www.aicte-india.org/schemes/students-development-schemes"
    }
]


@router.get("/offers")
def get_offers():
    """Returns dynamic student offers."""
    return OFFERS


@router.get("/opportunities")
def get_opportunities():
    """Returns combined jobs + scholarships (legacy endpoint)."""
    # Backward-compatible: merge jobs & scholarships into legacy format
    combined = []
    for j in JOBS:
        combined.append({
            "id": j["id"],
            "type": "job",
            "title": j["job_title"],
            "detail_1": f"{j['location']}",
            "detail_2": f"{j['salary_estimate']}",
            "apply_url": j["apply_url"]
        })
    for s in SCHOLARSHIPS:
        combined.append({
            "id": 100 + s["id"],
            "type": "scholarship",
            "title": s["scholarship_name"],
            "detail_1": f"{s['eligibility']}",
            "detail_2": f"Deadline: {s['deadline']}",
            "apply_url": s["apply_url"]
        })
    return combined


@router.get("/api/jobs")
def get_jobs():
    """Returns part-time job opportunities."""
    return JOBS


@router.get("/api/scholarships")
def get_scholarships():
    """Returns scholarship opportunities."""
    return SCHOLARSHIPS
