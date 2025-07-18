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

    await program.methods
      .increaseStake(new BN(10 * 10 ** DAO_MINT_DECIMALS))
      .accountsPartial({
        authority: voterAuthority.publicKey,
        stakeMint: DAO_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([voterAuthority])
      .rpc();
  });

  test("decrease voter stake", async () => {
    const amount = new BN(5 * 10 ** DAO_MINT_DECIMALS); // 5 tokens

    await program.methods
      .decreaseStake(amount)
      .accounts({
        authority: voterAuthority.publicKey,
      })
      .signers([voterAuthority])
      .rpc();

    const voterPda = getVoterPda(voterAuthority.publicKey);
    const voterAcc = await fetchVoterAcc(program, voterPda);

    expect(voterAcc.amountUnstaking.toNumber()).toBe(amount.toNumber());

    const now = Number(litesvm.getClock().unixTimestamp);

    const configPda = getConfigPda();
    const configAcc = await fetchConfigAcc(program, configPda);
    const unstakePeriod = configAcc.unstakePeriod;

    expect(now).toBe(
      voterAcc.unstakeCompleteTs.toNumber() - unstakePeriod.toNumber()
    );
  });

  test("throws if amount is invalid", async () => {
    try {
      await program.methods
        .decreaseStake(new BN(0))
        .accounts({
          authority: voterAuthority.publicKey,
        })
        .signers([voterAuthority])
        .rpc();
    } catch (err) {
      expectAnchorError(err, "InvalidStakeAmount");
    }
  });
});
