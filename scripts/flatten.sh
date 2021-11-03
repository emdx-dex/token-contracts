#!/usr/bin/env bash

if [ -d "flats" ]; then
    rm -rf flats/*
else
    mkdir flats
fi

files=(
    ./contracts/EMDXToken.sol
    ./contracts/Vesting.sol
)

for filename in "${files[@]}"; do
    name=${filename##*/}
    ./node_modules/.bin/truffle-flattener $filename  | awk '/SPDX-License-Identifier/&&c++>0 {next} 1' | awk '/pragma experimental ABIEncoderV2;/&&c++>0 {next} 1' > ./flats/${name%.*}Flattened.sol
    echo "|> $filename ** Flattened"
done
