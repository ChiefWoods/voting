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
import { fundedSystemAccountInfo, getSetup } from "../setup";
import { getConfigPda, getVoterPda } from "../pda";
import { fetchConfigAcc, fetchVoterAcc } from "../accounts";

describe("cancelUnstake", () => {
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
  });

  test("cancel full unstake amount", async () => {
    const voterPda = getVoterPda(voterAuthority.publicKey);
    const preVoterAcc = await fetchVoterAcc(program, voterPda);

    const amount = preVoterAcc.amountUnstaking;

    await program.methods
      .cancelUnstake(amount)
      .accountsPartial({
        authority: voterAuthority.publicKey,
      })
      .signers([voterAuthority])
      .rpc();

    const postVoterAcc = await fetchVoterAcc(program, voterPda);

    expect(postVoterAcc.amountUnstaking.toNumber()).toBe(0);
    expect(postVoterAcc.unstakeCompleteTs.toNumber()).toBe(0);
  });

  test("cancel partial unstake amount", async () => {
    const voterPda = getVoterPda(voterAuthority.publicKey);
    const preVoterAcc = await fetchVoterAcc(program, voterPda);
    const preAmountUnstaking = preVoterAcc.amountUnstaking;

    const amount = preVoterAcc.amountUnstaking.divn(2);

    await program.methods
      .cancelUnstake(amount)
      .accountsPartial({
        authority: voterAuthority.publicKey,
      })
      .signers([voterAuthority])
      .rpc();

    const postVoterAcc = await fetchVoterAcc(program, voterPda);
    const postAmountUnstaking = postVoterAcc.amountUnstaking;

    expect(preAmountUnstaking.toNumber()).toBe(
      postAmountUnstaking.toNumber() + amount.toNumber()
    );

    const now = Number(litesvm.getClock().unixTimestamp);

    const configPda = getConfigPda();
    const configAcc = await fetchConfigAcc(program, configPda);
    const unstakePeriod = configAcc.unstakePeriod;

    expect(now).toBe(
      postVoterAcc.unstakeCompleteTs.toNumber() - unstakePeriod.toNumber()
    );
  });
});
