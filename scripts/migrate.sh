#!/bin/bash

# Database Migration Script
# Usage: ./scripts/migrate.sh [staging|production]

set -e

ENVIRONMENT=$1
MIGRATION_DIR="server/migrations"

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
    echo "Usage: ./scripts/migrate.sh [staging|production]"
    exit 1
fi

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    log_info "Loading environment variables from .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    log_error "Environment file .env.$ENVIRONMENT not found"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL not set in environment"
    exit 1
fi

log_info "Running migrations for $ENVIRONMENT environment..."

# Create migrations table if it doesn't exist
log_info "Creating migrations tracking table..."
psql $DATABASE_URL << EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# Get list of applied migrations
APPLIED_MIGRATIONS=$(psql $DATABASE_URL -t -c "SELECT migration_name FROM schema_migrations;")

# Get list of migration files
if [ ! -d "$MIGRATION_DIR" ]; then
    log_error "Migration directory not found: $MIGRATION_DIR"
    exit 1
fi

MIGRATIONS=$(ls $MIGRATION_DIR/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATIONS" ]; then
    log_warn "No migration files found in $MIGRATION_DIR"
    exit 0
fi

# Run migrations
MIGRATION_COUNT=0
for migration_file in $MIGRATIONS; do
    migration_name=$(basename $migration_file)
    
    # Check if migration has already been applied
    if echo "$APPLIED_MIGRATIONS" | grep -q "$migration_name"; then
        log_info "⊘ Skipping already applied migration: $migration_name"
        continue
    fi
    
    log_info "Running migration: $migration_name"
    
    # Run migration in a transaction
    psql $DATABASE_URL << EOF
BEGIN;

-- Run the migration
\i $migration_file

-- Record the migration
INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name');

COMMIT;
EOF
    
    if [ $? -eq 0 ]; then
        log_info "✓ Migration completed: $migration_name"
        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    else
        log_error "✗ Migration failed: $migration_name"
        log_error "Rolling back transaction..."
        exit 1
    fi
done

if [ $MIGRATION_COUNT -eq 0 ]; then
    log_info "No new migrations to apply"
else
    log_info "========================================="
    log_info "Successfully applied $MIGRATION_COUNT migration(s)"
    log_info "========================================="
fi

# Display current migration status
log_info "Current migration status:"
psql $DATABASE_URL -c "SELECT migration_name, applied_at FROM schema_migrations ORDER BY applied_at;"

log_info "Migration process completed! ✓"
