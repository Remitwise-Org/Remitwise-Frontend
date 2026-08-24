#!/bin/bash
# Script to generate comprehensive test reports

set -e

echo "Generating test reports..."

# Create reports directory
mkdir -p reports

# Run all tests and capture output
echo "Running all tests..."
cargo test --all-features -- --test-threads=1 2>&1 | tee reports/test_output.txt

# Extract test statistics
TOTAL_TESTS=$(grep -c "test result:" reports/test_output.txt || echo "0")
PASSED_TESTS=$(grep -oP 'test result: ok. \K[0-9]+' reports/test_output.txt | head -1 || echo "0")
FAILED_TESTS=$(grep -oP 'test result: ok. [0-9]+ passed; \K[0-9]+' reports/test_output.txt | head -1 || echo "0")

# Generate JSON report
cat > reports/test_report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_tests": ${TOTAL_TESTS},
  "passed": ${PASSED_TESTS},
  "failed": ${FAILED_TESTS},
  "coverage": {
    "target": 95.0,
    "current": 0.0
  },
  "test_types": {
    "unit": 0,
    "integration": 0,
    "edge_cases": 0,
    "property_based": 0,
    "performance": 0
  }
}
EOF

# Generate markdown report
cat > reports/test_report.md << EOF
# Test Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Summary

- **Total Tests:** ${TOTAL_TESTS}
- **Passed:** ${PASSED_TESTS}
- **Failed:** ${FAILED_TESTS}
- **Success Rate:** $(echo "scale=2; ${PASSED_TESTS} * 100 / (${PASSED_TESTS} + ${FAILED_TESTS})" | bc -l)%

## Test Coverage

Target: 95%+

## Test Types

- Unit Tests
- Integration Tests
- Edge Case Tests
- Property-Based Tests
- Performance Benchmarks

## Details

See \`test_output.txt\` for full test output.
EOF

echo "Test reports generated in reports/ directory"
echo "- JSON: reports/test_report.json"
echo "- Markdown: reports/test_report.md"
echo "- Full output: reports/test_output.txt"
