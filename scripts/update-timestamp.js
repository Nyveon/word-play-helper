import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function updateTimestamp() {
    const htmlFilePath = join(process.cwd(), 'index.html');
    const wordlistFilePath = join(process.cwd(), 'data', 'wordsfullb.txt.gz');

    try {
        // Execute git command to get the last commit date for the specific file
        const gitDateOutput = execSync(`git log -1 --format=%cd --date=iso-strict ${wordlistFilePath}`).toString().trim();

        let lastCommitDate;
        if (gitDateOutput) {
            lastCommitDate = new Date(gitDateOutput);
        } else {
            console.warn(`Warning: Could not get last commit date for ${wordlistFilePath}. Using current date as fallback.`);
            lastCommitDate = new Date(); // Fallback to current date if no commit history
        }

        const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = lastCommitDate.toUTCString('en-US', dateOptions);

        let htmlContent = readFileSync(htmlFilePath, 'utf8');
        const regex = /(<span id="lastUpdatedTimestamp">)(.*?)(<\/span>)/;

        if (htmlContent.match(regex)) {
            htmlContent = htmlContent.replace(regex, `$1${formattedDate}$3`);
            writeFileSync(htmlFilePath, htmlContent, 'utf8');
            console.log(`Successfully updated timestamp in index.html to: ${formattedDate} (from Git commit of ${wordlistFilePath})`);
        } else {
            console.warn("Warning: Could not find <span id=\"lastUpdatedTimestamp\"> in index.html. Timestamp not updated.");
        }

    } catch (error) {
        console.error(`Error getting Git commit date or updating timestamp: ${error.message}`);
        console.warn("Please ensure Git is installed and the project is a Git repository.");
    }
}

updateTimestamp();
