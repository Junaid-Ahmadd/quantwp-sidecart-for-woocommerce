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

async function start() {
    // 1. Get current version from package.json
    const pkgPath = path.resolve(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const currentVersion = pkg.version;
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    console.log(`\n📌 Current Version: ${currentVersion}`);
    console.log(`Select increment:`);
    console.log(`1. Patch (${major}.${minor}.${patch + 1}) - Bug fixes`);
    console.log(`2. Minor (${major}.${minor + 1}.0) - New features`);
    console.log(`3. Major (${major + 1}.0.0) - Breaking changes`);

    const choice = await new Promise(resolve => {
        rl.question('Selection (1-3) or type custom version: ', resolve);
    });

    let newVersion;
    if (choice === '1') newVersion = `${major}.${minor}.${patch + 1}`;
    else if (choice === '2') newVersion = `${major}.${minor + 1}.0`;
    else if (choice === '3') newVersion = `${major + 1}.0.0`;
    else newVersion = choice.trim();

    if (!/^\d+\.\d+\.\d+/.test(newVersion)) {
        console.error('❌ Error: Invalid version format.');
        process.exit(1);
    }

    console.log(`\n🚀 Starting deployment for version ${newVersion}...\n`);

    // 2. Confirm Changelog
    const confirmed = await new Promise(resolve => {
        rl.question('❓ Have you updated the changelog in readme.txt? (y/n): ', (answer) => {
            resolve(answer.toLowerCase() === 'y');
        });
    });

    if (!confirmed) {
        console.log('❌ Deployment aborted. Please update the changelog first.');
        process.exit(0);
    }

    // 3. Get Commit Message
    const commitMessage = await new Promise(resolve => {
        rl.question(`❓ Enter commit message (default: Release version ${newVersion}): `, (answer) => {
            resolve(answer.trim() || `Release version ${newVersion}`);
        });
    });

    try {
        // 4. Update Files
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

        // 5. Git flow
        console.log('\n🌿 Promoting to main branch...');

        // Ensure we are currently on Beta
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
        if (currentBranch !== 'Beta') {
            console.log('⚠️ Warning: Not on Beta branch. Checking out Beta...');
            execSync('git checkout Beta');
        }

        execSync('git add .');
        try { execSync(`git commit -m "${commitMessage}"`); } catch (e) { }

        console.log('🔀 Merging Beta into main...');
        execSync('git checkout main');
        execSync('git merge Beta');

        // 6. Build
        console.log('🏗️ Running build...');
        execSync('bun run build', { stdio: 'inherit' });

        execSync('git add .');
        try { execSync(`git commit -m "${commitMessage}"`); } catch (e) { }

        // 7. Tag and Push
        console.log('🏷️ Tagging and pushing...');
        execSync(`git tag -a "${newVersion}" -m "Version ${newVersion}"`);
        execSync('git push origin main --tags');

        // 8. Return to Beta
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