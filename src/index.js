import React from 'react';
import ReactDOM from 'react-dom';
import Home from './home';
import Page1 from './page-1';
import Page2 from './page-2';
import { Router } from '@reach/router';

ReactDOM.render(
  <Router>
    <Home path="/" />
    <Page1 path="/page-1" />
    <Page2 path="/page-2" />
  </Router>,
  document.getElementById('app')
);

