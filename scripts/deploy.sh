#!/bin/bash

# SmartWallet Deployment Script
# Usage: ./scripts/deploy.sh [staging|production] [blue|green]

set -e

ENVIRONMENT=$1
SLOT=${2:-"blue"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
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
    echo "Usage: ./scripts/deploy.sh [staging|production] [blue|green]"
    exit 1
fi

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    log_error "Invalid environment: $ENVIRONMENT"
    echo "Environment must be 'staging' or 'production'"
    exit 1
fi

log_info "Starting deployment to $ENVIRONMENT ($SLOT slot)..."

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    log_info "Loading environment variables from .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    log_error "Environment file .env.$ENVIRONMENT not found"
    exit 1
fi

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if git working directory is clean
if [ "$ENVIRONMENT" = "production" ]; then
    if [ -n "$(git status --porcelain)" ]; then
        log_error "Git working directory is not clean. Commit or stash changes before deploying."
        exit 1
    fi
    log_info "✓ Git working directory is clean"
fi

# Check if tests pass
log_info "Running tests..."
cd Budget-app
npm test -- --run --passWithNoTests || {
    log_error "Tests failed. Fix tests before deploying."
    exit 1
}
log_info "✓ Tests passed"

# Build frontend
log_info "Building frontend..."
npm ci
npm run build || {
    log_error "Frontend build failed"
    exit 1
}
log_info "✓ Frontend built successfully"

# Build backend
log_info "Building backend..."
cd server
npm ci
npm run build || {
    log_error "Backend build failed"
    exit 1
}
cd ../..
log_info "✓ Backend built successfully"

# Database migrations
# Note: MongoDB migrations are handled via application code or separate scripts, not SQL files.
# See DEPLOYMENT_GUIDE.md for details.
# if [ "$ENVIRONMENT" = "production" ]; then
#     log_warn "Production deployment detected"
#     read -p "Run database migrations? (yes/no): " confirm
#     if [ "$confirm" = "yes" ]; then
#         log_info "Running database migrations..."
#         ./scripts/migrate.sh production || {
#             log_error "Database migrations failed"
#             exit 1
#         }
#         log_info "✓ Database migrations completed"
#     else
#         log_warn "Skipping database migrations"
#     fi
# else
#     log_info "Running database migrations..."
#     ./scripts/migrate.sh staging || {
#         log_error "Database migrations failed"
#         exit 1
#     }
#     log_info "✓ Database migrations completed"
# fi

# Deploy backend
log_info "Deploying backend..."

# Option 1: Docker deployment
if command -v docker &> /dev/null; then
    log_info "Building Docker image..."
    docker build -t smartwallet-api:$ENVIRONMENT-$SLOT -f Dockerfile.server Budget-app/server || {
        log_error "Docker build failed"
        exit 1
    }
    
    # Push to registry (if configured)
    if [ -n "$DOCKER_REGISTRY" ]; then
        log_info "Pushing to Docker registry..."
        docker tag smartwallet-api:$ENVIRONMENT-$SLOT $DOCKER_REGISTRY/smartwallet-api:$ENVIRONMENT-$SLOT
        docker push $DOCKER_REGISTRY/smartwallet-api:$ENVIRONMENT-$SLOT
    fi
    
    log_info "✓ Backend Docker image built"
fi

# Option 2: PM2 deployment (if PM2 is available)
if command -v pm2 &> /dev/null; then
    log_info "Deploying with PM2..."
    pm2 stop smartwallet-api-$ENVIRONMENT || true
    pm2 delete smartwallet-api-$ENVIRONMENT || true
    pm2 start Budget-app/server/dist/index.js \
        --name smartwallet-api-$ENVIRONMENT \
        --env $ENVIRONMENT
    pm2 save
    log_info "✓ Backend deployed with PM2"
fi

# Deploy frontend
log_info "Deploying frontend..."

# Option 1: AWS S3 + CloudFront
if command -v aws &> /dev/null && [ -n "$AWS_S3_BUCKET" ]; then
    log_info "Uploading to S3..."
    aws s3 sync Budget-app/dist/ s3://$AWS_S3_BUCKET --delete || {
        log_error "S3 upload failed"
        exit 1
    }
    
    if [ -n "$AWS_CLOUDFRONT_ID" ]; then
        log_info "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id $AWS_CLOUDFRONT_ID \
            --paths "/*" || {
            log_warn "CloudFront invalidation failed"
        }
    fi
    
    log_info "✓ Frontend deployed to S3"
fi

# Option 2: Traditional server deployment
if [ -n "$DEPLOY_SERVER" ]; then
    log_info "Deploying to server via SCP..."
    scp -r Budget-app/dist/* $DEPLOY_SERVER:/var/www/smartwallet || {
        log_error "SCP deployment failed"
        exit 1
    }
    
    log_info "Reloading web server..."
    ssh $DEPLOY_SERVER "sudo systemctl reload nginx" || {
        log_warn "Web server reload failed"
    }
    
    log_info "✓ Frontend deployed to server"
fi

# Post-deployment verification
log_info "Running post-deployment verification..."

# Wait for services to start
sleep 5

# Health check
if [ -n "$API_URL" ]; then
    log_info "Checking API health..."
    response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
    if [ $response -eq 200 ]; then
        log_info "✓ API health check passed"
    else
        log_error "API health check failed (HTTP $response)"
        exit 1
    fi
fi

# Run smoke tests
if [ -f "./scripts/smoke-test.sh" ]; then
    log_info "Running smoke tests..."
    ./scripts/smoke-test.sh $ENVIRONMENT || {
        log_error "Smoke tests failed"
        exit 1
    }
    log_info "✓ Smoke tests passed"
fi

# Deployment summary
log_info "========================================="
log_info "Deployment completed successfully!"
log_info "Environment: $ENVIRONMENT"
log_info "Slot: $SLOT"
log_info "Timestamp: $(date)"
log_info "========================================="

# Send notification (if configured)
if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST $SLACK_WEBHOOK \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ SmartWallet deployed to $ENVIRONMENT ($SLOT) successfully\"}"
fi

log_info "Deployment complete! 🎉"
