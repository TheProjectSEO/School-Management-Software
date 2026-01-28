#!/usr/bin/env python3

"""
Comprehensive Seed Data Script for MSU School OS
Connects teacher-app and student-app data
Schema: "school software" (CRITICAL)
"""

import os
import sys
import json
import uuid
from datetime import datetime
import requests
from typing import Dict, List, Any, Tuple

# Supabase Configuration
SUPABASE_URL = "https://qyjzqzqqjimittltttph.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o"

# Hardcoded IDs
SCHOOL_ID = "4fa1be18-ebf6-41e7-a8ee-800ac3815ecd"
TEACHER_EMAIL = "juan.delacruz@msu.edu.ph"
TEACHER_FULL_NAME = "Dr. Juan Dela Cruz"

# Base URLs
REST_URL = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

class SeedDataGenerator:
    def __init__(self):
        self.teacher_profile_id = None
        self.section_ids = []
        self.course_ids = []
        self.student_ids = []
        self.module_ids = []
        self.stats = {
            "sections": 0,
            "courses": 0,
            "assignments": 0,
            "students": 0,
            "enrollments": 0,
            "modules": 0,
            "lessons": 0
        }

    def log(self, message: str, level: str = "INFO"):
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def query(self, table: str, method: str = "GET", data: Dict = None, filters: str = "") -> Tuple[bool, Any]:
        """Execute Supabase query"""
        url = f"{REST_URL}/{table}{filters}"
        headers = HEADERS.copy()

        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == "PATCH":
                response = requests.patch(url, headers=headers, json=data, timeout=30)
            else:
                return False, f"Unknown method: {method}"

            if response.status_code in [200, 201]:
                return True, response.json()
            else:
                return False, f"Status {response.status_code}: {response.text}"

        except Exception as e:
            return False, str(e)

    def get_teacher_profile(self) -> bool:
        """Get teacher profile ID"""
        self.log("Step 1: Fetching teacher profile...")

        success, result = self.query(
            "teacher_profiles",
            filters=f'?school_id=eq.{SCHOOL_ID}&select=id'
        )

        if success and result and len(result) > 0:
            self.teacher_profile_id = result[0]["id"]
            self.log(f"Found teacher profile: {self.teacher_profile_id}", "SUCCESS")
            return True

        self.log("Teacher profile not found", "ERROR")
        return False

    def create_sections(self) -> bool:
        """Create 3 class sections"""
        self.log("Step 2: Creating class sections...")

        sections = [
            {"name": "Grade 10 - Einstein", "grade_level": "10"},
            {"name": "Grade 11 - Newton", "grade_level": "11"},
            {"name": "Grade 12 - Curie", "grade_level": "12"}
        ]

        for section in sections:
            data = {
                "school_id": SCHOOL_ID,
                "name": section["name"],
                "grade_level": section["grade_level"],
                "adviser_teacher_id": None
            }

            success, result = self.query("sections", method="POST", data=data)

            if success and result:
                section_id = result[0]["id"]
                self.section_ids.append(section_id)
                self.stats["sections"] += 1
                self.log(f"Created section: {section['name']}", "SUCCESS")
            else:
                self.log(f"Failed to create section {section['name']}: {result}", "ERROR")
                return False

        return True

    def create_courses(self) -> bool:
        """Create courses for each section"""
        self.log("Step 3: Creating courses...")

        courses_by_grade = {
            "10": [
                {"name": "Mathematics 101", "code": "MATH101", "desc": "Introduction to Algebra and Functions"},
                {"name": "Physics 101", "code": "PHYS101", "desc": "Fundamentals of Mechanics and Motion"},
                {"name": "English 101", "code": "ENG101", "desc": "Communication and Literature"}
            ],
            "11": [
                {"name": "Mathematics 201", "code": "MATH201", "desc": "Advanced Algebra and Trigonometry"},
                {"name": "Chemistry 101", "code": "CHEM101", "desc": "Basic Chemistry and Atomic Structure"}
            ],
            "12": [
                {"name": "Advanced Physics", "code": "PHYS201", "desc": "Advanced Mechanics and Thermodynamics"}
            ]
        }

        for section_id in self.section_ids:
            # Get section grade level
            success, result = self.query("sections", filters=f"?id=eq.{section_id}&select=grade_level")

            if not success or not result:
                continue

            grade_level = result[0]["grade_level"]
            courses = courses_by_grade.get(grade_level, [])

            for course in courses:
                data = {
                    "school_id": SCHOOL_ID,
                    "section_id": section_id,
                    "name": course["name"],
                    "subject_code": course["code"],
                    "description": course["desc"],
                    "teacher_id": self.teacher_profile_id
                }

                success, result = self.query("courses", method="POST", data=data)

                if success and result:
                    self.course_ids.append((result[0]["id"], section_id))
                    self.stats["courses"] += 1
                    self.log(f"Created course: {course['name']}", "SUCCESS")
                else:
                    self.log(f"Failed to create course {course['name']}: {result}", "ERROR")

        return len(self.course_ids) > 0

    def create_teacher_assignments(self) -> bool:
        """Create teacher assignments"""
        self.log("Step 4: Creating teacher assignments...")

        for course_id, section_id in self.course_ids:
            data = {
                "teacher_profile_id": self.teacher_profile_id,
                "section_id": section_id,
                "course_id": course_id,
                "is_primary": True
            }

            success, result = self.query("teacher_assignments", method="POST", data=data)

            if success:
                self.stats["assignments"] += 1
                self.log(f"Assigned course to teacher", "SUCCESS")

        return True

    def create_students(self) -> bool:
        """Create student accounts"""
        self.log("Step 5: Creating student accounts...")

        student_names = [
            "Juan Santos",
            "Maria Garcia",
            "Carlos Reyes",
            "Ana Fernandez",
            "Miguel Dela Cruz",
            "Rosa Montoya"
        ]

        student_counter = 0

        for section_id in self.section_ids:
            # Get section info
            success, result = self.query("sections", filters=f"?id=eq.{section_id}&select=grade_level")

            if not success or not result:
                continue

            grade_level = result[0]["grade_level"]

            # Create 5-6 students per section
            for i in range(6):
                student_name = student_names[student_counter % len(student_names)]
                lrn = str(int(100000000000 + (uuid.uuid4().int % 900000000000)))

                # Create profile
                profile_data = {
                    "auth_user_id": str(uuid.uuid4()),
                    "full_name": f"{student_name} ({i+1})"
                }

                success, result = self.query("profiles", method="POST", data=profile_data)

                if not success or not result:
                    self.log(f"Failed to create profile for {student_name}", "ERROR")
                    continue

                profile_id = result[0]["id"]

                # Create student record
                student_data = {
                    "school_id": SCHOOL_ID,
                    "profile_id": profile_id,
                    "lrn": lrn,
                    "grade_level": grade_level,
                    "section_id": section_id
                }

                success, result = self.query("students", method="POST", data=student_data)

                if success and result:
                    student_id = result[0]["id"]
                    self.student_ids.append((student_id, section_id))
                    self.stats["students"] += 1
                    self.log(f"Created student: {student_name}", "SUCCESS")
                else:
                    self.log(f"Failed to create student {student_name}: {result}", "ERROR")

                student_counter += 1

        return len(self.student_ids) > 0

    def create_enrollments(self) -> bool:
        """Create student enrollments in courses"""
        self.log("Step 6: Creating enrollments...")

        for student_id, section_id in self.student_ids:
            # Find courses for this section
            section_courses = [cid for cid, sid in self.course_ids if sid == section_id]

            for course_id in section_courses:
                data = {
                    "school_id": SCHOOL_ID,
                    "student_id": student_id,
                    "course_id": course_id
                }

                success, result = self.query("enrollments", method="POST", data=data)

                if success:
                    self.stats["enrollments"] += 1

        self.log(f"Created {self.stats['enrollments']} enrollments", "SUCCESS")
        return True

    def create_modules(self) -> bool:
        """Create modules for courses"""
        self.log("Step 7: Creating modules...")

        module_templates = {
            "Mathematics": ["Introduction to Algebra", "Linear Equations", "Polynomials"],
            "Physics": ["Motion and Forces", "Energy and Work"],
            "Chemistry": ["Atomic Structure", "Chemical Bonding"],
            "English": ["Creative Writing", "Literary Analysis"]
        }

        for course_id, _ in self.course_ids:
            # Get course name
            success, result = self.query("courses", filters=f"?id=eq.{course_id}&select=name")

            if not success or not result:
                continue

            course_name = result[0]["name"]

            # Find matching template
            template_modules = []
            for key, modules in module_templates.items():
                if key in course_name:
                    template_modules = modules
                    break

            if not template_modules:
                template_modules = ["Module 1", "Module 2"]

            for idx, module_title in enumerate(template_modules):
                data = {
                    "course_id": course_id,
                    "title": module_title,
                    "description": f"Learn about {module_title.lower()}",
                    "order": idx + 1,
                    "duration_minutes": 45,
                    "is_published": True
                }

                success, result = self.query("modules", method="POST", data=data)

                if success and result:
                    self.module_ids.append(result[0]["id"])
                    self.stats["modules"] += 1
                    self.log(f"Created module: {module_title}", "SUCCESS")

        return len(self.module_ids) > 0

    def create_lessons(self) -> bool:
        """Create lessons for modules"""
        self.log("Step 8: Creating lessons...")

        lesson_templates = [
            ["Introduction and Overview", "Core Concepts", "Practice Problems"],
            ["Fundamentals", "Advanced Topics", "Real-world Applications"],
            ["Getting Started", "Deep Dive", "Review and Practice"]
        ]

        content_types = ["video", "reading", "quiz"]

        for idx, module_id in enumerate(self.module_ids):
            lessons = lesson_templates[idx % len(lesson_templates)]

            for lesson_idx, lesson_title in enumerate(lessons):
                data = {
                    "module_id": module_id,
                    "title": lesson_title,
                    "content": f"Complete lesson content for {lesson_title}",
                    "content_type": content_types[lesson_idx % len(content_types)],
                    "duration_minutes": 15,
                    "order": lesson_idx + 1,
                    "is_published": True
                }

                success, result = self.query("lessons", method="POST", data=data)

                if success:
                    self.stats["lessons"] += 1
                    self.log(f"Created lesson: {lesson_title}", "SUCCESS")

        return True

    def print_summary(self):
        """Print completion summary"""
        print("\n" + "="*60)
        print("✨ SEED DATA GENERATION COMPLETE\n")
        print("📊 SUMMARY:")
        for key, value in self.stats.items():
            print(f"  • {key.replace('_', ' ').title()}: {value}")
        print("\n🔑 VERIFICATION:")
        print(f"  ✅ Teacher Profile ID: {self.teacher_profile_id}")
        print(f"  ✅ Sections Created: {len(self.section_ids)}")
        print(f"  ✅ Courses Created: {len(self.course_ids)}")
        print(f"  ✅ Students Created: {len(self.student_ids)}")
        print(f"  ✅ Modules Created: {len(self.module_ids)}")
        print("\n✅ Data is ready for testing across teacher-app and student-app!")
        print("="*60)

    def run(self) -> bool:
        """Execute all seeding steps"""
        self.log("Starting MSU School OS Seed Data Generation\n", "START")

        steps = [
            self.get_teacher_profile,
            self.create_sections,
            self.create_courses,
            self.create_teacher_assignments,
            self.create_students,
            self.create_enrollments,
            self.create_modules,
            self.create_lessons
        ]

        for step in steps:
            if not step():
                self.log(f"Stopping at {step.__name__}", "ERROR")
                return False

        self.print_summary()
        return True

if __name__ == "__main__":
    generator = SeedDataGenerator()
    success = generator.run()
    sys.exit(0 if success else 1)
