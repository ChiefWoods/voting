use anchor_lang::prelude::*;

#[account]
pub struct Proposal {
    pub id: u16,                // 2
    pub total_votes: u64,       // 8
    pub quorum_votes: u64,      // 8
    pub created_ts: i64,        // 8
    pub ending_ts: i64,         // 8
    pub points: u64,            // 8
    pub bump: u8,               // 1
    pub title: String,          // 4
    pub description: String,    // 4
    pub options: Vec<String>,   // 4
    pub option_votes: Vec<u64>, // 4
}

impl Proposal {
    pub fn space(title: String, description: String, options: Vec<String>) -> usize {
        return Proposal::DISCRIMINATOR.len()
            + 2
            + 8
            + 8
            + 8
            + 8
            + 8
            + 1
            + 4
            + title.len()
            + 4
            + description.len()
            + 4
            + options.iter().map(|s| s.len() + 4).sum::<usize>()
            + 4
            + options.len() * 8;
    }
}
