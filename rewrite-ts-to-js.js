const fs = require('fs');

changeTsToJs('./', 'prendus-view-question', '.html');
changeTsToJs('./', 'prendus-edit-question', '.html');

function changeTsToJs(filePath, fileName, fileExtension) {
    const fileContents = fs.readFileSync(`${filePath}${fileName}${fileExtension}`);
    fs.writeFileSync(`${filePath}${fileName}${fileExtension}`, fileContents.toString().replace(`<script src="${fileName}.ts"></script>`, `<script src="${fileName}.js"></script>`));
}
