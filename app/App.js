import sheet from './Sheet';
import React, {Component} from 'react';
import {BrowserRouter as Router, Route, Link} from 'react-router-dom';

const TITLE = 'COVID-19 Worker Impact';
const SPREADSHEET_ID = '1dwwhj2zVtQdUfk9eJiFJz-BKt3-ukH3oaGJp2MBtpSg';
const SPREADSHEET_NUM = 2;
const RESPONSE_TYPE_MAP = {
  'Reporting information you found in a news article or on social media?': 'report',
  "Providing a firsthand account or testimonial about a friend's experience or your own experiences?": 'anecdote'
};
const SECTIONS = {
  'report': [{
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
  }],
  'anecdote': [{
    key: 'relief',
    title: 'Relief'
  }, {
    key: 'federal-relief',
    title: 'Federal Relief'
  }, {
    key: 'barriers',
    title: 'Barriers to relief'
  }]
};


function slugify(str) {
  return str.toLowerCase()
    .replace(/\s+/g, '_')           // replace spaces with _
    .replace(/[^\w\-]+/g, '')       // remove all non-word chars
    .replace(/\-+/g, '_');          // replace - with single _
}

const Header = (props) => (
  <header>
    <h1>COVID-19 Worker Impact</h1>
    <nav>
      <h2>View by industry</h2>
      <div>
        <Link
          className={props.path == '/' ? 'selected': ''}
          to={'/'}>All</Link>

        {Object.keys(props.industries).map((ind, i) => (
          <Link
            key={i}
            className={props.path == `/${ind}` ? 'selected': ''}
            to={`/${ind}`}>{props.industries[ind].name}</Link>
        ))}
      </div>
    </nav>
  </header>
);

const Section = (props) => {
  let responses = props.responses.filter((r) => r.visible);
  return (
    <section>
      <h2>{props.name}</h2>
      {responses.length == 0 ?
        <h3>No results</h3> :
        <ul className="responses">
          {responses.map((r, i) => {
            let scope = r.scope;
            switch (r.scope) {
              case 'Class or group of workers':
                scope = <span>{r['worker-type']} <span className="scope">Workers</span></span>;
                break;
              case 'Specific business or company':
                scope = <span>{r['company']} <span className="scope">Company</span></span>;
                break;
            }
            if (r.type == 'anecdote') {
              scope = r.company;
            }

            return <li key={i}>
              <h6>{r.type}</h6>
              {scope ? <h4>{scope}</h4> : ''}
              {r.location ? <h4>{r.location}</h4> : ''}
              {r.type == 'anecdote' ? <p className="description">{r.description}</p> : '' }
              {SECTIONS[r.type].map((s, i) => (
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
        </ul>}
    </section>
  );
};

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      filter: ''
    };
  }

  componentWillMount() {
    const industries = {};
    sheet.load(SPREADSHEET_ID, SPREADSHEET_NUM, rows => {
      rows.map(r => {
        let type = RESPONSE_TYPE_MAP[r['response-type']];
        let keys = Object.keys(r).filter((k) => k.startsWith(type));
        let data = {};
        keys.forEach((k) => {
          let k_ = k.replace(`${type}.`, '');
          data[k_] = r[k];
        });
        data.type = type;
        data.visible = true;
        let industry = data['industry']
        let slug = slugify(industry);
        if (!(slug in industries)) {
          industries[slug] = {
            name: industry,
            responses: []
          };
        }
        industries[slug].responses.push(data);
      });
      this.setState({ industries });
    });

    this.setState({ industries });
  }

  updateFilter(filter) {
    filter = filter.toLowerCase();
    let industries = this.state.industries;
    Object.values(industries).forEach(({responses}) => {
      responses.forEach((r) => {
        r.visible = !filter || Object.values(r).some((v) => {
          return typeof v == 'string' && v.toLowerCase().includes(filter);
        });
      });
    });
    this.setState({ industries });
  }

  render() {
    return (
      <Router>
        <Route path='/' render={(props) => (
          <div>
            <Header industries={this.state.industries} path={props.location.pathname} />
            <div><input placeholder="Search" type='text' onChange={(ev) => this.updateFilter(ev.target.value)} /></div>
            <Route path='/' exact render={() => (
              <div>
                {Object.keys(this.state.industries).map((ind, i) => (
                  <Section key={i} {...this.state.industries[ind]} />
                ))}
              </div>
            )}/>
            <Route path='/:slug' render={({match}) => {
              if (Object.keys(this.state.industries).length === 0) {
                return (
                  <div>
                    <h1 className='loading'>Loading...</h1>
                  </div>);
              } else {
                let ind = this.state.industries[match.params.slug];
                if (ind) {
                  document.title = `${TITLE} : ${ind.name}`;
                  return (
                    <div>
                      <Section {...ind} />
                    </div>
                  );
                } else {
                  document.title = `${TITLE} : 404`;
                  return (
                    <div>
                      <h1 className='loading'>Sorry, nothing found.</h1>
                    </div>);
                }
              }
            }} />
          </div>
        )}/>
      </Router>
    )
  }
}

export default App;
