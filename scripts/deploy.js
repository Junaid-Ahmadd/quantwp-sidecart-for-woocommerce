const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Config
const filesToUpdate = {
    plugin: {
        path: 'quantwp-sidecart-for-woocommerce.php',
        replacements: [
            { regex: /Version:\s*.*/, replacement: 'Version: {VERSION}' },
            { regex: /define\('QUANTWP_VERSION',\s*'.*'\);/, replacement: "define('QUANTWP_VERSION', '{VERSION}');" }
        ]
    },
    readme: {
        path: 'readme.txt',
        replacements: [
            { regex: /Stable tag:\s*.*/, replacement: 'Stable tag: {VERSION}' }
        ]
    },
    package: {
        path: 'package.json',
        replacements: [
            { regex: /"version":\s*".*"/, replacement: '"version": "{VERSION}"' }
        ]
    }
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const newVersion = process.argv[2];

if (!newVersion) {
    console.error('Error: Please provide a version number (e.g., bun run deploy 3.1.0)');
    process.exit(1);
}

async function start() {
    console.log(`\n🚀 Starting deployment for version ${newVersion}...\n`);

    // 1. Confirm Changelog
    const confirmed = await new Promise(resolve => {
        rl.question('❓ Have you updated the changelog in readme.txt? (y/n): ', (answer) => {
            resolve(answer.toLowerCase() === 'y');
        });
    });

    if (!confirmed) {
        console.log('❌ Deployment aborted. Please update the changelog first.');
        process.exit(0);
    }

    // 1b. Get Commit Message
    const commitMessage = await new Promise(resolve => {
        rl.question(`❓ Enter commit message for version ${newVersion} (leave blank for default): `, (answer) => {
            resolve(answer.trim() || `Release version ${newVersion}`);
        });
    });

    try {
        // 2. Update Files
        console.log('📝 Updating version numbers in files...');
        for (const key in filesToUpdate) {
            const config = filesToUpdate[key];
            const fullPath = path.resolve(__dirname, '..', config.path);
            if (!fs.existsSync(fullPath)) {
                console.warn(`⚠️ Warning: ${config.path} not found, skipping.`);
                continue;
            }

            let content = fs.readFileSync(fullPath, 'utf8');
            config.replacements.forEach(rep => {
                content = content.replace(rep.regex, rep.replacement.replace('{VERSION}', newVersion));
            });
            fs.writeFileSync(fullPath, content);
            console.log(`   ✅ ${config.path}`);
        }

        // 3. Git flow
        console.log('\n🌿 Promoting to main branch...');
        
        // Ensure we are currently on Beta
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
        if (currentBranch !== 'Beta') {
             console.log('⚠️ Warning: Not on Beta branch. Checking out Beta...');
             execSync('git checkout Beta');
        }

        // Add version updates to Beta
        execSync('git add .');
        try {
            execSync(`git commit -m "${commitMessage}"`);
        } catch (e) {
            console.log('   ℹ️ No changes to commit in Beta.');
        }

        // Switch to main and merge
        console.log('🔀 Merging Beta into main...');
        execSync('git checkout main');
        execSync('git merge Beta');

        // 4. Build
        console.log('🏗️ Running build...');
        execSync('bun run build', { stdio: 'inherit' });

        // Add built assets
        execSync('git add .');
        try {
            execSync(`git commit -m "${commitMessage}"`);
        } catch (e) {
            console.log('   ℹ️ No changes to commit in main.');
        }

        // 5. Tag and Push
        console.log('🏷️ Tagging and pushing...');
        execSync(`git tag -a "${newVersion}" -m "Version ${newVersion}"`);
        execSync('git push origin main --tags');

        // 6. Return to Beta
        console.log('🔄 Switching back to Beta...');
        execSync('git checkout Beta');

        console.log(`\n🎉 Successfully promoted to Version ${newVersion}!\n`);

    } catch (err) {
        console.error('\n💥 Error during deployment:', err.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

start();
