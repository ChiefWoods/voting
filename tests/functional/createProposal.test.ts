import { BN, Program } from "@coral-xyz/anchor";
import { LiteSVMProvider } from "anchor-litesvm";
import { beforeEach, describe, expect, test } from "bun:test";
import { LiteSVM } from "litesvm";
import { Voting } from "../../target/types/voting";
import { Keypair } from "@solana/web3.js";
import { expectAnchorError, fundedSystemAccountInfo, getSetup } from "../setup";
import { DAO_MINT } from "../constants";
import { getConfigPda, getProposalPda } from "../pda";
import { fetchConfigAcc, fetchProposalAcc } from "../accounts";

describe("createProposal", () => {
  let { litesvm, provider, program } = {} as {
    litesvm: LiteSVM;
    provider: LiteSVMProvider;
    program: Program<Voting>;
  };

  const [configAuthority, invalidAuthority] = Array.from({ length: 2 }, () =>
    Keypair.generate()
  );

  const configPda = getConfigPda();

  beforeEach(async () => {
    ({ litesvm, provider, program } = await getSetup([
      ...[configAuthority, invalidAuthority].map((kp) => {
        return {
          pubkey: kp.publicKey,
          account: fundedSystemAccountInfo(),
        };
      }),
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
  });

  test("creates a proposal", async () => {
    const configAcc = await fetchConfigAcc(program, configPda);

    const quorumVotes = new BN(1);
    const endingTs = new BN(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
    const points = new BN(10);
    const title = "Testing";
    const description = "This is a test proposal";
    const options = ["Yes", "No", "Abstain"];

    await program.methods
      .createProposal({
        quorumVotes,
        endingTs,
        points,
        title,
        description,
        options,
      })
      .accounts({
        authority: configAuthority.publicKey,
      })
      .signers([configAuthority])
      .rpc();

    const proposalPda = getProposalPda(configAcc.nextProposalId);
    const proposalAcc = await fetchProposalAcc(program, proposalPda);

    expect(proposalAcc.id).toBe(configAcc.nextProposalId);
    expect(proposalAcc.quorumVotes.toNumber()).toBe(1);
    expect(proposalAcc.endingTs.toNumber()).toBe(endingTs.toNumber());
    expect(proposalAcc.points.toNumber()).toBe(points.toNumber());
    expect(proposalAcc.title).toBe(title);
    expect(proposalAcc.description).toBe(description);
    expect(proposalAcc.options).toEqual(options);
    expect(proposalAcc.optionVotes.length).toBe(options.length);
  });

  test("throws if creating proposal as invalid authority", async () => {
    try {
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
          authority: invalidAuthority.publicKey,
        })
        .signers([invalidAuthority])
        .rpc();
    } catch (err) {
      expectAnchorError(err, "InvalidAuthority");
    }
  });
});
