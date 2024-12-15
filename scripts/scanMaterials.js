import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to MachineLearning6025 in project root
const folderPath = path.join(__dirname, '..', 'MachineLearning6025');

try {
  const files = fs.readdirSync(folderPath)
    .filter(file => file.endsWith('.pptx') || file.endsWith('.pdf'))
    .map(file => {
      const stats = fs.statSync(path.join(folderPath, file));
      return {
        name: path.parse(file).name.replace(/_/g, ' '),
        type: path.extname(file).slice(1),
        path: `/MachineLearning6025/${file}`,
        description: "Machine Learning course material",
        size: stats.size,
        lastModified: stats.mtime
      };
    });

  const materialsData = {
    machinelearning: {
      title: "Machine Learning (COMP6025) Materials",
      files: files.sort((a, b) => a.name.localeCompare(b.name))
    }
  };

  // Write the result to materials.js
  const outputPath = path.join(__dirname, '..', 'src', 'client', 'data', 'materials.js');
  const outputContent = `export const materials = ${JSON.stringify(materialsData, null, 2)};`;
  
  fs.writeFileSync(outputPath, outputContent);
  console.log('Materials file updated successfully!');
  console.log('\nFound files:');
  files.forEach(file => {
    console.log(`- ${file.name} (${file.type})`);
  });

} catch (error) {
  console.error('Error scanning materials:', error);
} 