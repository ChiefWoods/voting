import { BN, Program } from "@coral-xyz/anchor";
import { LiteSVMProvider } from "anchor-litesvm";
import { beforeEach, describe, expect, test } from "bun:test";
import { LiteSVM } from "litesvm";
import { Voting } from "../../target/types/voting";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  ACCOUNT_SIZE,
  AccountLayout,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { DAO_MINT, DAO_MINT_DECIMALS } from "../constants";
import {
  expectAnchorError,
  forwardTime,
  fundedSystemAccountInfo,
  getSetup,
} from "../setup";
import { getProposalPda, getVotePda, getVoterPda } from "../pda";
import { fetchProposalAcc, fetchVoteAcc, fetchVoterAcc } from "../accounts";

describe("castVote", () => {
  let { litesvm, provider, program } = {} as {
    litesvm: LiteSVM;
    provider: LiteSVMProvider;
    program: Program<Voting>;
  };

  const [configAuthority, voterAuthority] = Array.from({ length: 2 }, () =>
    Keypair.generate()
  );
  const voterAuthorityAta = getAssociatedTokenAddressSync(
    DAO_MINT,
    voterAuthority.publicKey,
    false,
    TOKEN_PROGRAM_ID
  );

  const initAtaBal = 100 * 10 ** DAO_MINT_DECIMALS;

  beforeEach(async () => {
    const voterAuthorityAtaData = Buffer.alloc(ACCOUNT_SIZE);

    AccountLayout.encode(
      {
        amount: BigInt(initAtaBal),
        closeAuthority: voterAuthority.publicKey,
        closeAuthorityOption: 1,
        delegate: PublicKey.default,
        delegatedAmount: 0n,
        delegateOption: 0,
        isNative: 0n,
        isNativeOption: 0,
        mint: DAO_MINT,
        owner: voterAuthority.publicKey,
        state: 1,
      },
      voterAuthorityAtaData
    );

    ({ litesvm, provider, program } = await getSetup([
      ...[configAuthority, voterAuthority].map((kp) => {
        return {
          pubkey: kp.publicKey,
          account: fundedSystemAccountInfo(),
        };
      }),
      {
        pubkey: voterAuthorityAta,
        account: {
          data: voterAuthorityAtaData,
          executable: false,
          lamports: LAMPORTS_PER_SOL,
          owner: TOKEN_PROGRAM_ID,
        },
      },
    ]));

    await program.methods
      .initializeConfig({
        unstakePeriod: new BN(7 * 24 * 60 * 60),
      })
      .accounts({
        authority: configAuthority.publicKey,
        stakeMint: DAO_MINT,
      })
      .signers([configAuthority])
      .rpc();

    await program.methods
      .initializeVoter()
      .accounts({
        authority: voterAuthority.publicKey,
      })
      .signers([voterAuthority])
      .rpc();

    await program.methods
      .createProposal({
        quorumVotes: new BN(1),
        endingTs: new BN(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        points: new BN(10),
        title: "Testing",
        description: "This is a test proposal",
        options: ["Yes", "No", "Abstain"],
      })
      .accounts({
        authority: configAuthority.publicKey,
      })
      .signers([configAuthority])
      .rpc();
  });

  test("cast vote in proposal", async () => {
    await program.methods
      .increaseStake(new BN(10 * 10 ** DAO_MINT_DECIMALS))
      .accountsPartial({
        authority: voterAuthority.publicKey,
        stakeMint: DAO_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([voterAuthority])
      .rpc();

    const proposalPda = getProposalPda(1);
    const preProposalAcc = await fetchProposalAcc(program, proposalPda);
    const proposalPoints = preProposalAcc.points;
    const preProposalOptionVotes = preProposalAcc.optionVotes;

    const voterPda = getVoterPda(voterAuthority.publicKey);
    const preVoterAcc = await fetchVoterAcc(program, voterPda);
    const preVoterPoints = preVoterAcc.points;
    const voterStakedAmount = preVoterAcc.stakedAmount;

    const option = 0; // Yes

    await program.methods
      .castVote(option)
      .accountsPartial({
        authority: voterAuthority.publicKey,
        proposal: proposalPda,
      })
      .signers([voterAuthority])
      .rpc();

    const votePda = getVotePda(voterPda, proposalPda);
    const voteAcc = await fetchVoteAcc(program, votePda);

    expect(voteAcc.voter).toStrictEqual(voterPda);
    expect(voteAcc.proposal).toStrictEqual(proposalPda);
    expect(voteAcc.option).toBe(option);
    expect(voteAcc.weight.toNumber()).toBe(voterStakedAmount.toNumber());

    const now = Number(litesvm.getClock().unixTimestamp);

    expect(voteAcc.timestamp.toNumber()).toBe(now);

    const postVoterAcc = await fetchVoterAcc(program, voterPda);

    expect(preVoterPoints.toNumber()).toBe(
      postVoterAcc.points.toNumber() - proposalPoints.toNumber()
    );

    const postProposalAcc = await fetchProposalAcc(program, proposalPda);

    expect(preProposalOptionVotes[option].toNumber()).toBe(
      postProposalAcc.optionVotes[option].toNumber() -
        voterStakedAmount.toNumber()
    );
  });

  test("cast vote while unstaking in process", async () => {
    await program.methods
      .increaseStake(new BN(10 * 10 ** DAO_MINT_DECIMALS))
      .accountsPartial({
        authority: voterAuthority.publicKey,
        stakeMint: DAO_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([voterAuthority])
      .rpc();

    await program.methods
      .decreaseStake(new BN(5 * 10 ** DAO_MINT_DECIMALS))
      .accounts({
        authority: voterAuthority.publicKey,
      })
      .signers([voterAuthority])
      .rpc();

    forwardTime(litesvm, 3.5 * 24 * 60 * 60); // 3.5 days

    await program.methods
      .castVote(0)
      .accountsPartial({
        authority: voterAuthority.publicKey,
        proposal: getProposalPda(1),
      })
      .signers([voterAuthority])
      .rpc();

    const voterPda = getVoterPda(voterAuthority.publicKey);
    const voterAcc = await fetchVoterAcc(program, voterPda);
    const voterStakedAmount = voterAcc.stakedAmount;

    const proposalPda = getProposalPda(1);

    const votePda = getVotePda(voterPda, proposalPda);
    const voteAcc = await fetchVoteAcc(program, votePda);

    expect(voteAcc.weight.toNumber()).toBeLessThan(
      voterStakedAmount.toNumber()
    );
  });

  test("throws if no tokens are staked", async () => {
    try {
      await program.methods
        .castVote(0)
        .accountsPartial({
          authority: voterAuthority.publicKey,
          proposal: getProposalPda(1),
        })
        .signers([voterAuthority])
        .rpc();
    } catch (err) {
      expectAnchorError(err, "NoTokensStaked");
    }
  });
});
