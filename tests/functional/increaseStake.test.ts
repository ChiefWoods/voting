import { BN, Program } from "@coral-xyz/anchor";
import { LiteSVMProvider } from "anchor-litesvm";
import { beforeEach, describe, expect, test } from "bun:test";
import { LiteSVM } from "litesvm";
import { Voting } from "../../target/types/voting";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expectAnchorError, fundedSystemAccountInfo, getSetup } from "../setup";
import { DAO_MINT, DAO_MINT_DECIMALS } from "../constants";
import {
  ACCOUNT_SIZE,
  AccountLayout,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getConfigPda, getVoterPda } from "../pda";
import { fetchConfigAcc, fetchVoterAcc } from "../accounts";

describe("increaseStake", () => {
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
  });

  test("increase voter stake", async () => {
    const configPda = getConfigPda();
    const preConfigAcc = await fetchConfigAcc(program, configPda);
    const preConfigTotalStaked = preConfigAcc.totalStaked;

    const amount = new BN(10 * 10 ** DAO_MINT_DECIMALS); // 10 tokens

    await program.methods
      .increaseStake(amount)
      .accountsPartial({
        authority: voterAuthority.publicKey,
        stakeMint: DAO_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([voterAuthority])
      .rpc();

    const postConfigAcc = await fetchConfigAcc(program, configPda);
    const postConfigTotalStaked = postConfigAcc.totalStaked;

    expect(preConfigTotalStaked.toNumber()).toBe(
      postConfigTotalStaked.toNumber() - amount.toNumber()
    );

    const voterPda = getVoterPda(voterAuthority.publicKey);
    const voterAcc = await fetchVoterAcc(program, voterPda);

    expect(voterAcc.stakedAmount.toNumber()).toBe(amount.toNumber());

    const postVoterAuthorityAtaAcc = await getAccount(
      provider.connection,
      voterAuthorityAta,
      "processed",
      TOKEN_PROGRAM_ID
    );
    const postVoterAuthorityAtaBal = postVoterAuthorityAtaAcc.amount;

    expect(initAtaBal).toBe(
      Number(postVoterAuthorityAtaBal) + amount.toNumber()
    );

    const voterAta = getAssociatedTokenAddressSync(
      DAO_MINT,
      voterPda,
      true,
      TOKEN_PROGRAM_ID
    );
    const postVoterAtaAcc = await getAccount(
      provider.connection,
      voterAta,
      "processed",
      TOKEN_PROGRAM_ID
    );
    const postVoterAtaBal = postVoterAtaAcc.amount;

    expect(Number(postVoterAtaBal)).toBe(amount.toNumber());
  });

  test("throws if amount is invalid", async () => {
    const amount = new BN(0);

    try {
      await program.methods
        .increaseStake(amount)
        .accountsPartial({
          authority: voterAuthority.publicKey,
          stakeMint: DAO_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([voterAuthority])
        .rpc();
    } catch (err) {
      expectAnchorError(err, "InvalidStakeAmount");
    }
  });
});
