#!/bin/bash

# Smoke Test Script
# Usage: ./scripts/smoke-test.sh [staging|production]

set -e

ENVIRONMENT=$1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate arguments
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment not specified"
    echo "Usage: ./scripts/smoke-test.sh [staging|production]"
    exit 1
fi

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    log_error "Environment file .env.$ENVIRONMENT not found"
    exit 1
fi

# Set base URLs
if [ "$ENVIRONMENT" = "production" ]; then
    API_BASE_URL="https://api.smartwallet.com"
    FRONTEND_URL="https://smartwallet.com"
else
    API_BASE_URL="https://api-staging.smartwallet.com"
    FRONTEND_URL="https://staging.smartwallet.com"
fi

log_info "Running smoke tests for $ENVIRONMENT environment..."
log_info "API URL: $API_BASE_URL"
log_info "Frontend URL: $FRONTEND_URL"

FAILED_TESTS=0
PASSED_TESTS=0

# Test function
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo ""
    log_info "Testing: $test_name"
    
    if eval $test_command; then
        log_info "✓ $test_name passed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        log_error "✗ $test_name failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Test 1: API Health Check
run_test "API Health Endpoint" \
    "curl -sf $API_BASE_URL/health > /dev/null"

# Test 2: Frontend Accessibility
run_test "Frontend Accessibility" \
    "curl -sf -o /dev/null -w '%{http_code}' $FRONTEND_URL | grep -q '200'"

# Test 3: Database Connection
run_test "Database Connection" \
    "curl -sf $API_BASE_URL/api/health/db | jq -e '.status == \"ok\"' > /dev/null"

# Test 4: API Response Time
run_test "API Response Time (<2s)" \
    "[ \$(curl -sf -o /dev/null -w '%{time_total}' $API_BASE_URL/health | cut -d. -f1) -lt 2 ]"

# Test 5: Authentication Endpoint
run_test "Authentication Endpoint" \
    "curl -sf -o /dev/null -w '%{http_code}' $API_BASE_URL/api/auth/status | grep -q '200\|401'"

# Test 6: CORS Headers
run_test "CORS Headers" \
    "curl -sf -I $API_BASE_URL/health | grep -q 'Access-Control-Allow-Origin'"

# Test 7: SSL Certificate
run_test "SSL Certificate Valid" \
    "curl -sf --head $API_BASE_URL > /dev/null"

# Test 8: API Rate Limiting
run_test "Rate Limiting Configured" \
    "curl -sf -I $API_BASE_URL/api/transactions | grep -q 'X-RateLimit-Limit'"

# Test 9: Error Handling
run_test "Error Handling (404)" \
    "curl -sf -o /dev/null -w '%{http_code}' $API_BASE_URL/api/nonexistent | grep -q '404'"

# Test 10: Content Security
run_test "Security Headers Present" \
    "curl -sf -I $FRONTEND_URL | grep -q 'X-Content-Type-Options'"

# Feature-specific tests (if test credentials are available)
if [ -n "$TEST_USER_TOKEN" ]; then
    log_info "Running authenticated tests..."
    
    # Test 11: User Profile
    run_test "User Profile Endpoint" \
        "curl -sf -H 'Authorization: Bearer $TEST_USER_TOKEN' $API_BASE_URL/api/user/profile > /dev/null"
    
    # Test 12: Transactions List
    run_test "Transactions List Endpoint" \
        "curl -sf -H 'Authorization: Bearer $TEST_USER_TOKEN' $API_BASE_URL/api/transactions > /dev/null"
    
    # Test 13: Budgets List
    run_test "Budgets List Endpoint" \
        "curl -sf -H 'Authorization: Bearer $TEST_USER_TOKEN' $API_BASE_URL/api/budgets > /dev/null"
else
    log_warn "TEST_USER_TOKEN not set, skipping authenticated tests"
fi

# Summary
echo ""
log_info "========================================="
log_info "Smoke Test Summary"
log_info "========================================="
log_info "Passed: $PASSED_TESTS"
log_info "Failed: $FAILED_TESTS"
log_info "Total:  $((PASSED_TESTS + FAILED_TESTS))"
log_info "========================================="

if [ $FAILED_TESTS -gt 0 ]; then
    log_error "Some smoke tests failed!"
    exit 1
else
    log_info "All smoke tests passed! ✓"
    exit 0
fi
