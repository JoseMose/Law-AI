#!/bin/bash
# Georgia Code Collection Helper Script

echo "🗂️  Georgia Code Collection Helper"
echo "=================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required. Please install it first."
    exit 1
fi

# Check if required packages are installed
echo "📦 Checking dependencies..."
python3 -c "import requests, bs4" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing required packages..."
    pip3 install requests beautifulsoup4 lxml
fi

echo "✅ Dependencies ready"

# Function to collect specific titles
collect_titles() {
    echo "🎯 Collecting specific titles: $@"
    python3 georgia-code-collector.py --titles "$@" --max-sections 50
}

# Function to collect by practice area
collect_practice() {
    echo "🏷️  Collecting practice area: $1"
    python3 georgia-code-collector.py --practice "$1" --max-sections 100
}

# Function to show menu
show_menu() {
    echo ""
    echo "Choose collection method:"
    echo "1. Criminal Law (Title 16) - Assault, theft, robbery, etc."
    echo "2. Contract Law (Title 51) - Contracts, consideration, breach"
    echo "3. Family Law (Title 19) - Custody, support, divorce"
    echo "4. Business Law (Titles 14, 33) - Corporations, partnerships"
    echo "5. Employment Law (Titles 34, 45) - Wrongful termination, workers' comp"
    echo "6. Traffic Law (Title 40) - DUI, reckless driving, hit and run"
    echo "7. Property Law (Title 44) - Real property, landlord-tenant"
    echo "8. Custom titles (specify numbers)"
    echo "9. Quick test (collect 5 statutes from Title 16)"
    echo "0. Exit"
    echo ""
    read -p "Enter choice (0-9): " choice
}

# Main menu loop
while true; do
    show_menu

    case $choice in
        1)
            collect_practice "criminal"
            ;;
        2)
            collect_practice "contract"
            ;;
        3)
            collect_practice "family"
            ;;
        4)
            collect_practice "business"
            ;;
        5)
            collect_practice "employment"
            ;;
        6)
            collect_practice "traffic"
            ;;
        7)
            collect_practice "property"
            ;;
        8)
            echo "Enter title numbers separated by space (e.g., 16 51 19):"
            read -p "Titles: " titles
            collect_titles $titles
            ;;
        9)
            echo "🧪 Running quick test collection..."
            python3 georgia-code-collector.py --titles 16 --max-sections 5
            ;;
        0)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please try again."
            ;;
    esac

    echo ""
    echo "📊 Collection complete! Check georgia-code-expanded.json for new data."
    echo "Run this script again to collect more data."
    echo ""
    read -p "Press Enter to continue..."
done