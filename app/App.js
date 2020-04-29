import sheet from './Sheet';
import marked from 'marked';
import DOMPurify from 'dompurify';
import React, {Component} from 'react';
import {BrowserRouter as Router, Route, Link, Switch} from 'react-router-dom';

const TITLE = 'Work After COVID-19';
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
    key: 'company-response',
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
  return str.toLowerCase().trim()
    .replace(/\s+/g, '_')           // replace spaces with _
    .replace(/[^\w\-]+/g, '')       // remove all non-word chars
    .replace(/\-+/g, '_');          // replace - with single _
}

const Header = (props) => (
  <header>
    <div className="title">
      <h1>Work After COVID-19</h1>
      <Link to='/about'>About</Link>
    </div>
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
            to={`/${ind}`}>{props.industries[ind].name.replace(/\(.+\)/,'').trim()}</Link>
        ))}
      </div>

      <h2>View by tag</h2>
      <div>
        <Link
          className={props.path == '/' ? 'selected': ''}
          to={'/'}>All</Link>

        {Object.keys(props.tags).filter((t) => t).map((tag, i) => (
          <Link
            key={i}
            className={props.path == `/tags/${tag}` ? 'selected': ''}
            to={`/tags/${tag}`}>{props.tags[tag].name.replace(/\(.+\)/,'').trim()}</Link>
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
      {props.summary ? <div className="summary">
        <h6>Summary</h6>
        <p>{props.summary}</p>
      </div> : ''}
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
              <h6>{r.type} <span className="when">{r.when}</span></h6>
              {scope ? <h4>{scope}{r.location ? <span className="location">, {r.location}</span> : ''}</h4> : ''}
              {r.tags ? <p className="tags">{r.tags.split(',').map((t, i) => <Link to={`/tags/${slugify(t)}`} className="tag" key={i}>{t.trim()}</Link>)}</p> : ''}
              {r.type == 'anecdote' ? <p>{r.description}</p> : ''}
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
    const about = {};
    const industries = {};
    const summaries = {};
    const tags = {};
    sheet.load(SPREADSHEET_ID, 3, rows => {
      rows.forEach((r) => {
        let slug = slugify(r.industry);
        summaries[slug] = r.summary;
      });
      this.setState({ summaries });
    });

    sheet.load(SPREADSHEET_ID, 4, rows => {
      let description = rows[0].body;
      about.description = DOMPurify.sanitize(marked(description));

      let scope = rows[1].body;
      about.scope = DOMPurify.sanitize(marked(scope));
    });

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

        data.tags.split(',').forEach((t) => {
          let tag = t.trim();
          t = slugify(t);
          if (!(t in tags)) {
            tags[t] = {
              name: tag,
              responses: []
            };
          }
          tags[t].responses.push(data);
        });

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
      this.setState({ industries, tags });
    });

    this.setState({ industries, tags, summaries, about });
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
        <Switch>
          <Route path='/about' render={(props) => (
            <div>
              <Header path={props.location.pathname} {...this.state} />
              <div className="about">
                <h2>About</h2>
                <section dangerouslySetInnerHTML={{__html: this.state.about.description || ''}}></section>

                <h3>Scope</h3>
                <section dangerouslySetInnerHTML={{__html: this.state.about.scope || ''}}></section>
              </div>
            </div>
          )} />
          <Route path='/' render={(props) => (
            <div>
              <Header path={props.location.pathname} {...this.state} />
              <div><input placeholder="Search" type='text' onChange={(ev) => this.updateFilter(ev.target.value)} /></div>
              <Route path='/' exact render={() => (
                <div>
                  {Object.keys(this.state.industries).map((ind, i) => (
                    <Section key={i} summary={this.state.summaries[ind]} {...this.state.industries[ind]} />
                  ))}
                </div>
              )}/>
              <Switch>
                <Route path='/tags/:slug' render={({match}) => {
                  if (Object.keys(this.state.tags).length === 0) {
                    return (
                      <div>
                        <h1 className='loading'>Loading...</h1>
                      </div>);
                  } else {
                    let tag = this.state.tags[match.params.slug];
                    if (tag) {
                      return <div>
                        <Section summary={''} {...tag} />
                      </div>
                    } else {
                      document.title = `${TITLE} : 404`;
                      return (
                        <div>
                          <h1 className='loading'>Sorry, nothing found.</h1>
                        </div>);
                    }
                  }
                }} />

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
                          <Section summary={this.state.summaries[match.params.slug]} {...ind} />
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
              </Switch>
            </div>
          )}/>
        </Switch>
      </Router>
    )
  }
}

export default App;
