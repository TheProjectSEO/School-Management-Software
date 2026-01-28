#!/bin/bash

# Comprehensive Seed Data Script for MSU School OS
# Uses curl to interact with Supabase REST API
# Schema: "school software" (CRITICAL)

set -e

# Configuration
SUPABASE_URL="https://qyjzqzqqjimittltttph.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5anpxenFxamltaXR0bHR0dHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTk5OTksImV4cCI6MjA3NjYzNTk5OX0.YQA0wSqdri73o6WW4-BZl0i8oKlMNcj702nAZvWkR9o"
REST_URL="$SUPABASE_URL/rest/v1"
SCHOOL_ID="4fa1be18-ebf6-41e7-a8ee-800ac3815ecd"

# Counters
SECTIONS=0
COURSES=0
ASSIGNMENTS=0
STUDENTS=0
ENROLLMENTS=0
MODULES=0
LESSONS=0

# Helper function
log() {
    echo "[$(date '+%H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%H:%M:%S')] ERROR: $1" >&2
}

# Helper to make API calls
api_call() {
    local method=$1
    local table=$2
    local data=$3
    local filter=$4
    
    local url="$REST_URL/$table$filter"
    local headers="-H 'apikey: $SUPABASE_KEY' -H 'Content-Type: application/json' -H 'Prefer: return=representation'"
    
    if [ "$method" = "GET" ]; then
        curl -s -X GET "$url" $headers
    elif [ "$method" = "POST" ]; then
        curl -s -X POST "$url" $headers -d "$data"
    fi
}

# Step 1: Get teacher profile
log "Step 1: Fetching teacher profile..."
TEACHER_PROFILE=$(api_call GET "teacher_profiles" "" "?school_id=eq.$SCHOOL_ID&limit=1")
TEACHER_ID=$(echo "$TEACHER_PROFILE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TEACHER_ID" ]; then
    error "Teacher profile not found"
    exit 1
fi
log "  ✅ Found teacher profile: $TEACHER_ID"

# Step 2: Create sections
log "Step 2: Creating class sections..."
declare -a SECTION_IDS

sections=(
    '{"school_id":"'$SCHOOL_ID'","name":"Grade 10 - Einstein","grade_level":"10"}'
    '{"school_id":"'$SCHOOL_ID'","name":"Grade 11 - Newton","grade_level":"11"}'
    '{"school_id":"'$SCHOOL_ID'","name":"Grade 12 - Curie","grade_level":"12"}'
)

for section_data in "${sections[@]}"; do
    RESULT=$(api_call POST "sections" "$section_data")
    SECTION_ID=$(echo "$RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$SECTION_ID" ]; then
        SECTION_IDS+=("$SECTION_ID")
        ((SECTIONS++))
        SECTION_NAME=$(echo "$section_data" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
        log "  ✅ Created section: $SECTION_NAME"
    fi
done

# Step 3: Create courses
log "Step 3: Creating courses..."
declare -a COURSE_DATA

# Grade 10 courses
for section_id in "${SECTION_IDS[@]}"; do
    courses=(
        '{"school_id":"'$SCHOOL_ID'","section_id":"'$section_id'","name":"Mathematics 101","subject_code":"MATH101","description":"Introduction to Algebra and Functions","teacher_id":"'$TEACHER_ID'"}'
        '{"school_id":"'$SCHOOL_ID'","section_id":"'$section_id'","name":"Physics 101","subject_code":"PHYS101","description":"Fundamentals of Mechanics","teacher_id":"'$TEACHER_ID'"}'
        '{"school_id":"'$SCHOOL_ID'","section_id":"'$section_id'","name":"English 101","subject_code":"ENG101","description":"Communication and Literature","teacher_id":"'$TEACHER_ID'"}'
    )
    
    for course_data in "${courses[@]}"; do
        RESULT=$(api_call POST "courses" "$course_data")
        COURSE_ID=$(echo "$RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        if [ -n "$COURSE_ID" ]; then
            COURSE_DATA+=("$COURSE_ID:$section_id")
            ((COURSES++))
            COURSE_NAME=$(echo "$course_data" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
            log "  ✅ Created course: $COURSE_NAME"
        fi
    done
done

log ""
log "Step 4: Creating teacher assignments..."
for course_info in "${COURSE_DATA[@]}"; do
    COURSE_ID="${course_info%:*}"
    SECTION_ID="${course_info#*:}"
    
    assign_data='{"teacher_profile_id":"'$TEACHER_ID'","section_id":"'$SECTION_ID'","course_id":"'$COURSE_ID'","is_primary":true}'
    RESULT=$(api_call POST "teacher_assignments" "$assign_data")
    
    if echo "$RESULT" | grep -q '"id"'; then
        ((ASSIGNMENTS++))
    fi
done
log "  ✅ Created $ASSIGNMENTS teacher assignments"

log ""
echo "============================================================"
echo "✨ SEED DATA GENERATION COMPLETE"
echo ""
echo "📊 SUMMARY:"
echo "  • Sections Created: $SECTIONS"
echo "  • Courses Created: $COURSES"
echo "  • Teacher Assignments: $ASSIGNMENTS"
echo ""
echo "🔑 VERIFICATION:"
echo "  ✅ Teacher Profile ID: $TEACHER_ID"
echo "  ✅ Section IDs: ${SECTION_IDS[@]}"
echo "  ✅ Course Count: $COURSES"
echo ""
echo "✅ Data structure ready - continue with students, enrollments, modules, and lessons"
echo "============================================================"
