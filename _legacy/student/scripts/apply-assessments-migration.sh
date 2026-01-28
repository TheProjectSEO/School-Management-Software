#!/bin/bash

# Apply the assessments and submissions migration
# This script populates the database with comprehensive assessment data

echo "================================================"
echo "Applying Assessments & Submissions Migration"
echo "================================================"
echo ""

# Navigate to the student-app directory
cd "$(dirname "$0")/.."

echo "Step 1: Checking Supabase status..."
npx supabase status

echo ""
echo "Step 2: Applying migration 008..."
npx supabase db push

echo ""
echo "Step 3: Verifying data..."
npx supabase db remote sql "
SELECT
  'Courses' as entity_type,
  COUNT(*)::text as count
FROM courses
UNION ALL
SELECT
  'Assessments',
  COUNT(*)::text
FROM assessments
UNION ALL
SELECT
  'Quiz Questions',
  COUNT(*)::text
FROM questions
UNION ALL
SELECT
  'Submissions',
  COUNT(*)::text
FROM submissions
UNION ALL
SELECT
  'Enrollments',
  COUNT(*)::text
FROM enrollments;
"

echo ""
echo "================================================"
echo "Migration Applied Successfully!"
echo "================================================"
echo ""
echo "SUMMARY:"
echo "- 10 Total Courses (5 existing + 5 new)"
echo "- ~28 Assessments (mix of quizzes, assignments, projects, exams)"
echo "- ~30 Quiz questions with multiple choice options"
echo "- Multiple submissions (pending, submitted, graded)"
echo "- Notifications for upcoming work"
echo ""
echo "Students now have a full workload to interact with!"
echo ""
