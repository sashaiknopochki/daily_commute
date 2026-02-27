// Using next/babel preset instead of SWC so that @babel/preset-env
// reads the browserslist ("ios >= 12") and lowers ?. and ?? operators
// that Safari 12 cannot parse. This ensures all code — including
// transpilePackages dependencies like @radix-ui/* and zod — is
// compiled to be compatible with iOS 12.
module.exports = {
  presets: ['next/babel'],
}
