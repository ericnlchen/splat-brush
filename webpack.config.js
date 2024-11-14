const path = require( 'path' );

module.exports = {

    // bundling mode
    mode: 'development',

    // entry files
    entry: './src/app.ts',

    // output bundles (location)
    output: {
        path: path.resolve( __dirname, 'build-ts' ),
        filename: 'main.js',
    },

    // file resolutions
    resolve: {
        extensions: [ '.ts', '.js' ],
    },

    // loaders
    module: {
        rules: [
            {
                test: /\.tsx?/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.wasm$/,           // Adjust the regex to match your file type
                type: 'asset/inline',     // Use asset/source to import as string
            },
        ]
    },

    watch: true
};