# Prendus Question Elements

Fully embeddable custom HTML elements for questions made with [AssessML](https://github.com/Prendus/assessml). Use these elements in any web platform project, including [Web Components](https://www.webcomponents.org/), [Polymer](https://www.polymer-project.org/), [SkateJS](https://github.com/skatejs/skatejs), [React](https://facebook.github.io/react/), [Vue.js](https://vuejs.org/), [Angular](https://angular.io/), [Ember.js](https://www.emberjs.com/), and Vanilla.

## Demo

[Click to see live question editor](https://prendus.com/question/cj4yhatlcphu20137xdwhb3pu/demo)
[Click to see live question](https://prendus.com/question/cj4yhatlcphu20137xdwhb3pu/view)
Click to see many more examples

## Installation

To use in your own project:

```bash
npm install prendus-question-elements

# Eventually the bower commands below will disappear, but until we can fully support npm, sorry

bower install polymer --save
bower install paper-tabs --save
bower install iron-pages --save
bower install juicy-ace-editor --save
bower install wysiwyg-e --save
```

To work on locally:

```bash
git clone https://github.com/Prendus/prendus-question-elements
cd prendus-question-elements
npm install

# Eventually the bower commands below will disappear, but until we can fully support npm, sorry

bower install polymer --save
bower install paper-tabs --save
bower install iron-pages --save
bower install juicy-ace-editor --save
bower install wysiwyg-e --save

npm run link
npm run test

# or to open a debug window for the tests

npm run test-window
```

## Use

Import the Web Components polyfill for cross-browser compatibility:

```HTML
...
<head>
  <script src="[path to bower_components]/webcomponentsjs/webcomponents-lite.js"></script>
</head>
...
```

Import the element that you would like to use:

```HTML
<link rel="import" href="[path to node_modules]/prendus-question-elements/prendus-view-question.html">
<link rel="import" href="[path to node_modules]/prendus-question-elements/prendus-edit-question.html">
```

Then use the element wherever you would like:

```HTML
<prendus-view-question question-id="cj4os7mld6kq4017073x00cjt"></prendus-view-question>
<prendus-edit-question question-id="cj4os7mld6kq4017073x00cjt"></prendus-edit-question>
```
