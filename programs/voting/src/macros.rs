#[macro_export]
macro_rules! voter_signer {
    ($authority: expr, $bump: expr) => {
        &[VOTER_SEED, $authority, &[$bump]]
    };
}
