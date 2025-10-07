#!/bin/bash

# Georgia Law Research Deployment Script
# This script deploys the complete Georgia Law Research system to AWS

set -e  # Exit on any error

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

# Check if AWS CLI is configured
check_aws_config() {
    print_status "Checking AWS CLI configuration..."
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    print_success "AWS CLI is configured"
}

# Check if required files exist
check_files() {
    print_status "Checking required files..."

    required_files=(
        "server/serverless.yml"
        "server/georgia-code.json"
        "server/lambda-law-embeddings.js"
        "server/lambda-law-search.js"
        "server/lambda-law-summarize.js"
        "server/opensearch-template.yaml"
        "server/upload-georgia-code.js"
        "package.json"
    )

    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            print_error "Required file missing: $file"
            exit 1
        fi
    done

    print_success "All required files present"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."

    # Install server dependencies
    cd server
    if [[ -f "package.json" ]]; then
        npm install
        print_success "Server dependencies installed"
    fi
    cd ..

    # Install root dependencies
    if [[ -f "package.json" ]]; then
        npm install
        print_success "Root dependencies installed"
    fi
}

# Deploy OpenSearch domain
deploy_opensearch() {
    print_status "Deploying OpenSearch domain..."

    if aws cloudformation describe-stacks --stack-name georgia-law-opensearch &> /dev/null; then
        print_warning "OpenSearch stack already exists. Skipping deployment."
        return 0
    fi

    aws cloudformation deploy \
        --template-file server/opensearch-template.yaml \
        --stack-name georgia-law-opensearch \
        --parameter-overrides DomainName=georgia-law-vectors \
        --capabilities CAPABILITY_IAM

    print_success "OpenSearch domain deployed"

    # Wait for OpenSearch to be ready
    print_status "Waiting for OpenSearch domain to be ready..."
    sleep 300  # Wait 5 minutes for domain creation
}

# Get OpenSearch endpoint
get_opensearch_endpoint() {
    print_status "Getting OpenSearch endpoint..."

    OPENSEARCH_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name georgia-law-opensearch \
        --query 'Stacks[0].Outputs[?OutputKey==`OpenSearchEndpoint`].OutputValue' \
        --output text)

    if [[ -z "$OPENSEARCH_ENDPOINT" ]]; then
        print_error "Failed to get OpenSearch endpoint"
        exit 1
    fi

    print_success "OpenSearch endpoint: $OPENSEARCH_ENDPOINT"

    # Export for use in Lambda functions
    export OPENSEARCH_ENDPOINT
}

# Upload Georgia Code data to S3
upload_data() {
    print_status "Uploading Georgia Code data to S3..."

    # Check if S3_BUCKET_NAME is set
    if [[ -z "$S3_BUCKET_NAME" ]]; then
        print_error "S3_BUCKET_NAME environment variable not set"
        exit 1
    fi

    # Upload the data
    aws s3 cp server/georgia-code.json "s3://$S3_BUCKET_NAME/georgia-code/georgia-code.json"

    print_success "Georgia Code data uploaded to S3"
}

# Deploy Lambda functions
deploy_lambdas() {
    print_status "Deploying Lambda functions..."

    cd server

    # Deploy with serverless framework
    serverless deploy

    print_success "Lambda functions deployed"
    cd ..
}

# Test deployment
test_deployment() {
    print_status "Testing deployment..."

    # Get API Gateway URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name lawai-serverless-dev \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
        --output text)

    if [[ -z "$API_URL" ]]; then
        print_error "Failed to get API Gateway URL"
        exit 1
    fi

    print_success "API Gateway URL: $API_URL"

    # Test health check (if implemented)
    # curl -s "$API_URL/health" || print_warning "Health check endpoint not available"

    print_success "Deployment test completed"
}

# Main deployment flow
main() {
    print_status "Starting Georgia Law Research deployment..."

    check_aws_config
    check_files
    install_dependencies
    deploy_opensearch
    get_opensearch_endpoint
    upload_data
    deploy_lambdas
    test_deployment

    print_success "🎉 Georgia Law Research deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Manually trigger the embeddings Lambda function to process statutes"
    echo "2. Test the search functionality through the React frontend"
    echo "3. Monitor CloudWatch logs for any issues"
    echo ""
    echo "API Endpoints:"
    echo "- Search: POST /laws/search"
    echo "- Summarize: POST /laws/summarize"
}

# Run main function
main "$@"