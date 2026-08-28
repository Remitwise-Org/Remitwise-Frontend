#[cfg(test)]
mod unit_tests {
    use crate::propchain_insurance::InsuranceError;

    #[test]
    fn error_variants_are_distinct() {
        assert_ne!(InsuranceError::Unauthorized, InsuranceError::PolicyNotFound);
        assert_ne!(InsuranceError::ClaimNotFound, InsuranceError::PoolNotFound);
        assert_ne!(InsuranceError::PolicyExpired, InsuranceError::PolicyInactive);
    }

    #[test]
    fn error_debug_format_is_readable() {
        let err = InsuranceError::InsufficientPremium;
        let msg = format!("{:?}", err);
        assert!(!msg.is_empty());
    }

    #[test]
    fn invalid_parameters_error_exists() {
        let err = InsuranceError::InvalidParameters;
        assert_eq!(err, InsuranceError::InvalidParameters);
    }

    #[test]
    fn zero_amount_error_exists() {
        let err = InsuranceError::ZeroAmount;
        assert_eq!(err, InsuranceError::ZeroAmount);
    }

    #[test]
    fn contract_paused_error_exists() {
        let err = InsuranceError::ContractPaused;
        assert_eq!(err, InsuranceError::ContractPaused);
    }
}
