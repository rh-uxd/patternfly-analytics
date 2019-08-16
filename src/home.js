import React from 'react';
import { Link } from '@reach/router';
import '@patternfly/react-core/dist/styles/base.css';
import Plotly from 'plotly.js';

var trace1 = {
  x: [1, 2, 3, 4],
  y: [10, 15, 13, 17],
  mode: 'markers',
  type: 'scatter'
};

var trace2 = {
  x: [2, 3, 4, 5],
  y: [16, 5, 11, 9],
  mode: 'lines',
  type: 'scatter'
};

var trace3 = {
  x: [1, 2, 3, 4],
  y: [12, 9, 15, 12],
  mode: 'lines+markers',
  type: 'scatter'
};

var data = [trace1, trace2, trace3];

export default class Home extends React.Component {
  componentDidMount() {
    Plotly.newPlot('myDiv', data);
  }

  render() {
    return   (
      <React.Fragment>
        <ul>
          <li><Link to="/page-1">Page 1</Link></li>
          <li><Link to="/page-2">Page 2</Link></li>
        </ul>
        <p>Home</p>
        <div id="myDiv" width="400px" height="300px" />
      </React.Fragment>
    );
  }
}
