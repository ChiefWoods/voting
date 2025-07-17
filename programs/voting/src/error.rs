use anchor_lang::prelude::*;

#[error_code]
pub enum VotingError {
    #[msg("Title must be at least 3 characters long")]
    TitleTooShort,
    #[msg("Stake amount must be greater than 0")]
    InvalidStakeAmount,
    #[msg("At least 2 options are required")]
    NotEnoughOptions,
    #[msg("At least 5 tokens must be staked to cast a vote")]
    NoTokensStaked,
    #[msg("Stake can only be withdrawn after the unstake period")]
    UnstakingNotComplete,
    #[msg("Authority does not match the one in config")]
    InvalidAuthority,
}
