# Prendus Question Elements

Fully embeddable custom HTML elements for Prendus questions.

## Installation

To use in your own project:

```bash
npm install prendus-question-elements
bower install polymer --save
bower install paper-tabs --save
```

To work on locally:

```bash
git clone https://github.com/Prendus/prendus-question-elements
cd prendus-question-elements
bower install
npm install
npm link
npm run test
```

## Use

First import the polyfill for HTML Web Components inside of the `<head></head>` element or anywhere in the `<body></body>` element before you place any of the Prendus custom elements (eventually this will not be necessary, but it is necessary now to support non-compliant browsers):

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

Now import the custom element you would like to use, either inside of the `<head></head>` element or anywhere in the `<body></body>` element before you place the custom element:

In the `<head></head>`:
```HTML
...
<head>
  <script src="node_modules/prendus-question-elements/prendus-view-question.html"></script>
</head>
...
```

In the `<body></body>`:

```HTML
<body>
  <script src="node_modules/prendus-question-elements/prendus-view-question.html"></script>
</body>
```

Then use the element wherever you would like:

```HTML
<prendus-view-question question-id="cj3ytnhdl7wz80112o9ebshi3"></prendus-view-question>
```
