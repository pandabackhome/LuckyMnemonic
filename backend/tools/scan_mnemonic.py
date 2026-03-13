import time
import requests
from bip_utils import (
    Bip39SeedGenerator, Bip44, Bip44Coins, Bip44Changes,
    Bip49, Bip49Coins, Bip84, Bip84Coins
)
from bip_utils.utils.mnemonic.mnemonic_ex import MnemonicChecksumError


def validate_and_get_seed(mnemonic_str):
    try:
        seed_bytes = Bip39SeedGenerator(mnemonic_str).Generate()
        print("check ok!")
        return seed_bytes
    except MnemonicChecksumError:
        print("err: words wrong.")
    except ValueError as e:
        print(f"err: words not in BIP39: {e}")
    except Exception as e:
        print(f"err unknown: {e}")
    return None


def check_balance(address):
    """Blockstream API"""
    try:
        url = f"https://blockstream.info/api/address/{address}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            stats = data.get('chain_stats', {})
            funded = stats.get('funded_txo_sum', 0)
            spent = stats.get('spent_txo_sum', 0)
            balance_sat = funded - spent
            return balance_sat / 10**8
    except Exception as e:
        print(f"  [!] addr err {address}: {e}")
    return 0


def scan_mnemonic(mnemonic_list, addr_limit=5):
    mnemonic_str = " ".join(mnemonic_list).strip()
    seed = validate_and_get_seed(mnemonic_str=mnemonic_str)
    if seed:
        seed_bytes = Bip39SeedGenerator(mnemonic_str).Generate()
    else:
        return {"status": "mnemonic no", "balance": 0.0}

    path_configs = [
        {"name": "Legacy (BIP44)", "class": Bip44, "coin": Bip44Coins.BITCOIN},
        {"name": "Nested SegWit (BIP49)", "class": Bip49,
         "coin": Bip49Coins.BITCOIN},
        {"name": "Native SegWit (BIP84)", "class": Bip84,
         "coin": Bip84Coins.BITCOIN},
    ]

    for config in path_configs:
        bip_mst_ctx = config['class'].FromSeed(seed_bytes, config['coin'])
        bip_acc_ctx = bip_mst_ctx.Purpose().Coin().Account(
            0).Change(Bip44Changes.CHAIN_EXT)

        for i in range(addr_limit):
            bip_addr_ctx = bip_acc_ctx.AddressIndex(i)
            address = bip_addr_ctx.PublicKey().ToAddress()

            balance = check_balance(address)
            if balance > 0:
                print("mnemonic_str: ", mnemonic_str)
                print(f"  Index {i}: {address} | balance: {balance:.8f} BTC.")
                return {"status": "Boom", "balance": balance}
            time.sleep(0.5)

    return {"status": "mnemonic yes", "balance": 0.0}
