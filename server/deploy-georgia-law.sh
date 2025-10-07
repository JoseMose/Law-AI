#!/bin/bash

# Georgia Law Research Deployment Script
# This script deploys the complete Georgia Law Research system

set -e

echo "🚀 Starting Georgia Law Research Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env_vars() {
    print_status "Checking environment variables..."

    required_vars=("S3_BUCKET_NAME" "OPENSEARCH_ENDPOINT" "OPENSEARCH_USERNAME" "OPENSEARCH_PASSWORD")
    missing_vars=()

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -ne 0 ]]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        print_error "Please set these in your .env file"
        exit 1
    fi

    print_success "All required environment variables are set"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Upload Georgia Code to S3
upload_georgia_code() {
    print_warning "Skipping S3 upload - data will be included in Lambda package"
    print_status "Georgia Code dataset will be deployed with Lambda functions"
}

# Deploy Lambda functions
deploy_lambdas() {
    print_status "Deploying Lambda functions to AWS..."
    npx serverless deploy
    print_success "Lambda functions deployed"
}

# Create OpenSearch index (optional - can be done via Lambda)
create_opensearch_index() {
    print_status "Note: OpenSearch index will be created automatically by the embeddings Lambda"
    print_status "You can trigger the embeddings Lambda manually after deployment"
}

# Main deployment flow
main() {
    echo "⚖️  Georgia Law Research Deployment Script"
    echo "========================================"

    check_env_vars
    install_dependencies
    upload_georgia_code
    deploy_lambdas
    create_opensearch_index

    echo ""
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Trigger the embeddings Lambda to process the Georgia Code:"
    echo "   - Go to AWS Lambda console"
    echo "   - Find 'lawai-serverless-dev-createLawEmbeddings' function"
    echo "   - Click 'Test' to create embeddings and populate OpenSearch"
    echo ""
    echo "2. Test the search functionality:"
    echo "   - Open your React app"
    echo "   - Go to Legal Research > Georgia Law Research"
    echo "   - Try searching for statutes like 'aggravated assault' or 'contract breach'"
    echo ""
    echo "3. The system is now ready for production use!"
}

# Run main function
main "$@"