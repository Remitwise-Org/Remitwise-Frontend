# Automated Security Audit Pipeline

This project includes a comprehensive automated security pipeline that runs on every commit and pull request.

## Components

### 1. Static Analysis
- **Clippy**: Rust's standard linter with strict security settings.
- **Custom Security Tool**: A custom Rust tool (`security-audit`) that scans for:
  - `unsafe` blocks
  - `TODO`/`FIXME` comments
  - Code complexity metrics
- **Trivy**: Scans filesystem and dependencies for known vulnerabilities.

### 2. Dependency Scanning
- **cargo-audit**: Checks `Cargo.lock` for crates with security vulnerabilities reported to the RustSec Advisory Database.

### 3. Formal Verification
- **Kani Rust Verifier**: We use Kani to formally verify critical properties of the smart contracts.
- **Proof Harnesses**: Located in `contracts/lib/src/lib.rs` under `mod verification`.

## Running Locally

To run the security audit locally:

```bash
# Build the audit tool
cargo build --release --bin security-audit

# Run the audit
./target/release/security-audit audit --report report.json
```

To run formal verification:

```bash
# Install Kani
cargo install --locked kani-verifier
cargo kani setup

# Run proofs
cargo kani
```

## CI/CD Integration

The pipeline is defined in `.github/workflows/security.yml`. It runs:
1.  **Automated Security Pipeline**: Runs the custom audit tool and generates a JSON report.
2.  **Formal Verification**: Runs Kani proofs.
3.  **Dependency Check**: Runs Trivy.

## Security Score

The audit tool calculates a security score (0-100) based on:
- Clippy errors/warnings (-10/-2 points)
- Unsafe blocks (-5 points)
- Known vulnerabilities (-20 points)
