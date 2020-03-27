import sheet from './Sheet';
import React, {Component} from 'react';
import {BrowserRouter as Router, Route, Link, Switch} from 'react-router-dom';

const TITLE = 'COVID-19 Worker Impact';
const SPREADSHEET_ID = '1dwwhj2zVtQdUfk9eJiFJz-BKt3-ukH3oaGJp2MBtpSg';
const SPREADSHEET_NUM = 2;
const RESPONSE_TYPE_MAP = {
  'Reporting information you found in a news article or on social media?': 'report',
  'Providing a firsthand account or testimonial about your own experiences?': 'anecdote'
};
const SECTIONS = [{
  key: 'impact',
  title: 'Impact'
}, {
  key: 'company-respose',
  title: 'Company response'
}, {
  key: 'relief',
  title: 'Relief'
}, {
  key: 'barriers',
  title: 'Barriers to relief'
}];


function slugify(str) {
  return str.toLowerCase()
    .replace(/\s+/g, '_')           // replace spaces with _
    .replace(/[^\w\-]+/g, '')       // remove all non-word chars
    .replace(/\-+/g, '_');          // replace - with single _
}


class TOC extends Component {
  componentWillMount() {
    this.setState({
      open: true
    });
  }

  renderList() {
    return (
      <ul>
        {Object.keys(this.props.sections).map((sec, i) => {
          return (
            <li key={i}>
              <Link to={`/${sec}`}>{this.props.sections[sec].category}</Link>
            </li>
          );
        })}
      </ul>
    );
  }

  toggle() {
    this.setState({
      open: !this.state.open
    });
  }

  render() {
    return (
      <div className="toc">
        <div className="toggle-toc" onClick={this.toggle.bind(this)}>
        </div>
        {this.state.open ? this.renderList() : ''}
      </div>
    );
  }
}

class App extends Component {
  componentWillMount() {
    const responses = {};
    sheet.load(SPREADSHEET_ID, SPREADSHEET_NUM, rows => {
      rows.map(r => {
        let type = RESPONSE_TYPE_MAP[r['response-type']];
        let keys = Object.keys(r).filter((k) => k.startsWith(type));
        let data = {};
        keys.forEach((k) => {
          let k_ = k.replace(`${type}.`, '');
          data[k_] = r[k];
        });
        let industry = data['industry']
        if (!(industry in responses)) {
          responses[industry] = [];
        }
        responses[industry].push(data);
      });
      this.setState({ responses });
    });

    this.setState({ responses });
  }

  render() {
    return (
      <Router>
        <div>
          <Switch>
            <Route path='/' exact render={() => (
              <div>
                <h1>COVID-19 Worker Impact</h1>
                {Object.keys(this.state.responses).map((ind, i) => (
                  <section key={i}>
                    <h2>{ind}</h2>
                    <ul>
                      {this.state.responses[ind].map((r, i) => {
                        let scope = r.scope;
                        switch (r.scope) {
                          case 'Class or group of workers':
                            scope = <span><span className="scope">Workers</span> {r['worker-type']}</span>;
                            break;
                          case 'Specific business or company':
                            scope = <span><span className="scope">Company</span> {r['company']}</span>;
                            break;
                        }

                        return <li key={i}>
                          <h6>Report</h6>
                          <h4>{scope}</h4>
                          {r.location ? <h4>{r.location}</h4> : ''}
                          {SECTIONS.map((s, i) => (
                            r[s.key] ?
                              <div key={i}>
                                <h5>{s.title}</h5>
                                <p>{r[s.key]}</p>
                                {r[`${s.key}.citation`] ?
                                    <ul className="citations">
                                      {r[`${s.key}.citation`].split('\n').map((c, j) => (
                                        <li key={j}><a href={c}>{c.replace(/\?.+/, '')}</a></li>))}
                                    </ul> : ''}
                              </div> : ''
                          ))}
                        </li>
                      })}
                    </ul>
                  </section>))}
              </div>
            )}/>
            <Route path='/:slug' render={({match}) => {
              if (Object.keys(this.state.sections).length === 0) {
                return <h1 className='loading'>Loading...</h1>;
              } else {
                let sec = this.state.sections[match.params.slug];
                if (sec) {
                  document.title = `${TITLE} : ${sec.category}`;
                  return <Section {...sec} />;
                } else {
                  document.title = `${TITLE} : 404`;
                  return <h1 className='loading'>Sorry, nothing found!</h1>;
                }
              }
            }} />
          </Switch>
        </div>
      </Router>
    )
  }
}

export default App;
