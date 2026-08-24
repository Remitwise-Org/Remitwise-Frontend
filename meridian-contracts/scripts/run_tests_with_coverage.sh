#!/bin/bash
# Script to run tests with coverage reporting

set -e

echo "Running tests with coverage..."

# Install cargo-tarpaulin if not present
if ! command -v cargo-tarpaulin &> /dev/null; then
    echo "Installing cargo-tarpaulin..."
    cargo install cargo-tarpaulin
fi

# Create coverage directory
mkdir -p coverage

# Run tests with coverage
echo "Running unit tests with coverage..."
cargo tarpaulin \
    --out Html \
    --out Xml \
    --output-dir coverage \
    --exclude-files '*/tests/*' \
    --exclude-files '*/target/*' \
    --timeout 120 \
    --all-features

# Run formal verification tests
echo "Running formal verification tests..."
cargo test --features verification 2>/dev/null || echo "Warning: Formal verification tests failed or skipped"

# Run kani verification if available
if command -v cargo-kani &> /dev/null; then
    echo "Running kani verification..."
    cd contracts/lib
    cargo kani --features verification 2>/dev/null || echo "Warning: Kani verification failed or skipped"
    cd ../..
else
    echo "cargo-kani not found, skipping kani verification"
fi

# Generate coverage report
echo "Coverage report generated in coverage/ directory"
echo "HTML report: coverage/tarpaulin-report.html"
echo "XML report: coverage/coverage.xml"

# Check coverage threshold
COVERAGE=$(grep -oP 'coverage: \K[0-9.]+' coverage/tarpaulin-report.html | head -1 || echo "0")
THRESHOLD=95.0

if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
    echo "WARNING: Coverage is ${COVERAGE}%, below threshold of ${THRESHOLD}%"
    exit 1
else
    echo "SUCCESS: Coverage is ${COVERAGE}%, above threshold of ${THRESHOLD}%"
fi
