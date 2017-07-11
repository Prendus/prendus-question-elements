const fs = require('fs');

changeTsToJs('./', './dist/', 'prendus-view-question', '.html');
changeTsToJs('./', './dist/', 'prendus-edit-question', '.html');

function changeTsToJs(sourceFilePath, destinationFilePath, fileName, fileExtension) {
    const fileContents = fs.readFileSync(`${sourceFilePath}${fileName}${fileExtension}`);
    fs.writeFileSync(`${destinationFilePath}${fileName}${fileExtension}`, fileContents.toString().replace(`<script src="${fileName}.ts"></script>`, `<script src="${fileName}.js"></script>`));
}
