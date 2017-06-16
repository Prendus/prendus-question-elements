# Prendus Question Elements

Fully embeddable custom HTML elements for Prendus questions.

## Installation

To use in your own project:

```bash
npm install prendus-question-elements
```

To work on locally:

```bash
git clone https://github.com/Prendus/prendus-question-elements
cd prendus-question-elements
bower install
npm install
npm run test
```

## Use

Import the polyfill for HTML Web Components inside of the `<head></head>` element or anywhere in the `<body></body>` element before you place any of the Prendus custom elements (eventually this will not be necessary, but it is necessary now to support non-compliant browsers):

In the `<head></head>`:
```HTML
...
<head>
  <script src="node_modules/@npm-polymer/webcomponentsjs/webcomponents-lite.js"></script>
</head>
...
```

In the `<body></body>`:

```HTML
<body>
  <script src="node_modules/@npm-polymer/webcomponentsjs/webcomponents-lite.js"></script>
</body>
```
