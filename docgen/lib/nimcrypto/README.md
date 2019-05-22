---
sidebar: auto
---

# Nimcrypto

Nimcrypto is Nim's cryptographic library. It implements several popular
cryptographic algorithms and their tests with some examples in the
[official
repo](https://github.com/cheatfate/nimcrypto/tree/master/examples).

Most notably, this library has been used in the [Nimbus Ethereum
client](https://our.status.im/nimbus-for-newbies/). To see the
implementation, check out its [Github
repository](https://github.com/status-im/nimbus).

The most basic usage

```bash
$ nimble install nimcrypto # installation

# example.nim
import nimcrypto

echo keccak_256.digest("Alice makes a hash") 
# outputs EF0CC652868DF797522FB1D5A39E58E069154D9E47E5D7DB288B7200DB6EDFEE
```

## [Algorithm Implementations](#Implementations)

For usage examples of the below algorithm implementations see each
module's individual page.

### [nimcrypto/hash](nimcrypto/hash.html)

This module provides helper procedures for calculating secure digests
supported by nimcrypto library.

### [nimcrypto/sha2](nimcrypto/sha2.html)

This module implements SHA2 (Secure Hash Algorithm 2) set of
cryptographic hash functions designed by National Security Agency,
version FIPS-180-4.
\[<http://csrc.nist.gov/publications/fips/fips180-4/fips-180-4.pdf>\]

### [nimcrypto/ripemd](nimcrypto/ripemd.html)

This module implements RIPEMD set of cryptographic hash functions,
designed by Hans Dobbertin, Antoon Bosselaers and Bart Preneel.
\[<http://www.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf>\]

This module is Nim adoptation of original C source code by Antoon
Bosselaers.
\[<https://homes.esat.kuleuven.be/~bosselae/ripemd160/ps/AB-9601/rmd160.c>\]

This module includes support of RIPEMD-128/160/256/320.

### [nimcrypto/keccak](nimcrypto/keccak.html)

This module implements SHA3 (Secure Hash Algorithm 3) set of
cryptographic hash functions designed by Guido Bertoni, Joan Daemen,
Michaël Peeters and Gilles Van Assche.

This module supports SHA3-224/256/384/512 and SHAKE-128/256.

### [nimcrypto/blake2](nimcrypto/blake2.html)

This module implements BLAKE2 set of cryptographic hash functions
designed by Jean-Philippe Aumasson, Luca Henzen, Willi Meier, Raphael
C.W. Phan.

This module supports BLAKE2s-224/256 and BLAKE2b-384/512.

### [nimcrypto/hmac](nimcrypto/hmac.html)

This module implements HMAC (Keyed-Hashing for Message Authentication)
\[[http://www.ietf.org/rfc/rfc2104.txt\]](http://www.ietf.org/rfc/rfc2104.txt%5D).

### [nimcrypto/rijndael](nimcrypto/rijndael.html)

This module implements Rijndael(AES) crypto algorithm by Vincent Rijmen,
Antoon Bosselaers and Paulo Barreto.

Code based on version 3.0 (December 2000) of Optimised ANSI C code for
the Rijndael cipher
\[[http://www.fastcrypto.org/front/misc/rijndael-alg-fst.c\]](http://www.fastcrypto.org/front/misc/rijndael-alg-fst.c%5D).

### [nimcrypto/blowfish](nimcrypto/blowfish.html)

This module implements Blowfish crypto algorithm by Bruce Schneier

Code based on C implementation of the Blowfish algorithm created by Paul
Kocher
\[[https://www.schneier.com/code/bfsh-koc.zip\]](https://www.schneier.com/code/bfsh-koc.zip%5D).

### [nimcrypto/twofish](nimcrypto/twofish.html)

This module implements Twofish crypto algorithm by Bruce Schneier.

Code based on Optimized C created by Drew Csillag
\[[https://www.schneier.com/code/twofish-cpy.zip\]](https://www.schneier.com/code/twofish-cpy.zip%5D).

### [nimcrypto/bcmode](nimcrypto/bcmode.html)

This module implements various Block Cipher Modes.

The five modes currently supported:

  - ECB (Electronic Code Book)
  - CBC (Cipher Block Chaining)
  - CFB (Cipher FeedBack)
  - OFB (Output FeedBack)
  - CTR (Counter)
  - GCM (Galois/Counter Mode)

You can use any of this modes with all the block ciphers of nimcrypto
library

GHASH implementation is Nim version of ghash\_ctmul64.c which is part of
decent BearSSL project
\<[https://bearssl.org\>](https://bearssl.org%3E). Copyright (c) 2016
Thomas Pornin \<pornin@bolet.org\>

### [nimcrypto/utils](nimcrypto/utils.html)

Utility functions common to all submodules.

### [nimcrypto/sysrand](nimcrypto/sysrand.html)

This module implements interface to operation system's random number
generator.

- `Windows` using BCryptGenRandom (if available),
CryptGenRandom(PROV\_INTEL\_SEC) (if available), RtlGenRandom.

RtlGenRandom (available from Windows XP) BCryptGenRandom (available from
Windows Vista SP1) CryptGenRandom(PROV\_INTEL\_SEC) (only when Intel
SandyBridge CPU is available).

- `Linux` using genrandom (if available), /dev/urandom.

- `OpenBSD` using getentropy.

- `NetBSD`, `FreeBSD`, `MacOS`, `Solaris` using /dev/urandom.