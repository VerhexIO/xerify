(function attachXerifyDesignSystem(global) {
  'use strict';

  const React = global.React;
  if (!React) throw new Error('Xerify design previews require React before _ds_bundle.js');

  function Button({ variant = 'primary', size = 'md', children, icon, disabled = false, onClick }) {
    const sizes = {
      sm: { padding: '8px 16px', fontSize: 'var(--text-sm)' },
      md: { padding: '13px 26px', fontSize: 'var(--text-base)' }
    };
    const variants = {
      primary: {
        background: 'var(--accent-verify)',
        color: 'var(--accent-verify-inverse)',
        border: '1px solid var(--accent-verify)'
      },
      verify: {
        background: 'var(--accent-check)',
        color: '#fff',
        border: '1px solid var(--accent-check)'
      },
      secondary: {
        background: 'transparent',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-strong)'
      },
      ghost: {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: '1px solid transparent'
      }
    };
    const style = {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      borderRadius: 'var(--radius-md)',
      letterSpacing: '0.01em',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'opacity var(--duration-fast) var(--ease-standard)',
      ...sizes[size],
      ...variants[variant]
    };
    return React.createElement(
      'button',
      {
        style,
        disabled,
        onClick,
        onMouseEnter: (event) => {
          if (!disabled) event.currentTarget.style.opacity = 0.82;
        },
        onMouseLeave: (event) => {
          if (!disabled) event.currentTarget.style.opacity = 1;
        }
      },
      icon
        ? React.createElement(
            'span',
            { style: { display: 'inline-flex', width: 14, height: 14 } },
            icon
          )
        : null,
      children
    );
  }

  function Badge({ children, tone = 'neutral' }) {
    const tones = {
      neutral: {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-strong)'
      },
      verify: {
        background: 'var(--accent-verify)',
        color: 'var(--accent-verify-inverse)',
        border: '1px solid var(--accent-verify)'
      },
      check: {
        background: 'var(--accent-check)',
        color: '#fff',
        border: '1px solid var(--accent-check)'
      }
    };
    return React.createElement(
      'span',
      {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          letterSpacing: 'var(--tracking-wider)',
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          display: 'inline-block',
          textTransform: 'uppercase',
          ...tones[tone]
        }
      },
      children
    );
  }

  function Tag({ children }) {
    return React.createElement(
      'span',
      {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          padding: '5px 12px',
          display: 'inline-block'
        }
      },
      children
    );
  }

  function VerdictPill({ verdict = 'confirmed', showExit = true }) {
    const config = {
      confirmed: {
        label: 'CONFIRMED',
        exit: 'exit 0',
        fg: 'var(--status-confirmed-fg)',
        bg: 'var(--status-confirmed-bg)'
      },
      refuted: {
        label: 'REFUTED',
        exit: 'exit 10',
        fg: 'var(--status-refuted-fg)',
        bg: 'var(--status-refuted-bg)'
      },
      unclear: {
        label: 'UNCLEAR',
        exit: 'exit 11',
        fg: 'var(--status-unclear-fg)',
        bg: 'var(--status-unclear-bg)'
      }
    }[verdict];
    return React.createElement(
      'span',
      {
        style: {
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          letterSpacing: 'var(--tracking-wide)',
          color: config.fg,
          background: config.bg,
          border: `1px solid ${config.fg}22`,
          borderRadius: 'var(--radius-sm)',
          padding: '7px 14px',
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: '10px'
        }
      },
      config.label,
      showExit
        ? React.createElement(
            'span',
            { style: { fontWeight: 400, fontSize: 'var(--text-xs)' } },
            config.exit
          )
        : null
    );
  }

  function Callout({ tone = 'neutral', title, children }) {
    const tones = {
      neutral: { border: 'var(--border-strong)', fg: 'var(--text-primary)' },
      check: { border: 'var(--accent-check)', fg: 'var(--accent-check)' },
      caution: { border: 'var(--status-unclear-fg)', fg: 'var(--status-unclear-fg)' }
    };
    const selected = tones[tone] || tones.neutral;
    return React.createElement(
      'div',
      {
        style: {
          borderLeft: `2px solid ${selected.border}`,
          background: 'var(--surface-sunken)',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          padding: '20px 26px',
          fontFamily: 'var(--font-sans)'
        }
      },
      title
        ? React.createElement(
            'div',
            {
              style: {
                fontWeight: 600,
                fontSize: 'var(--text-xs)',
                color: selected.fg,
                marginBottom: '8px',
                letterSpacing: 'var(--tracking-wider)',
                textTransform: 'uppercase'
              }
            },
            title
          )
        : null,
      React.createElement(
        'div',
        {
          style: {
            fontSize: 'var(--text-base)',
            color: 'var(--text-secondary)',
            lineHeight: 'var(--leading-normal)'
          }
        },
        children
      )
    );
  }

  function Terminal({ title = 'shell', lines = [] }) {
    return React.createElement(
      'div',
      {
        style: {
          background: 'var(--surface-panel-2)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-panel)',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)',
          border: '1px solid var(--border-panel)'
        }
      },
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            background: 'var(--surface-panel)',
            borderBottom: '1px solid var(--border-panel)'
          }
        },
        React.createElement('span', {
          style: {
            width: 7,
            height: 7,
            background: 'var(--accent-check-inverse)',
            display: 'inline-block'
          }
        }),
        React.createElement(
          'span',
          {
            style: {
              color: 'var(--text-inverse-muted)',
              fontSize: 'var(--text-xs)',
              letterSpacing: 'var(--tracking-wider)',
              textTransform: 'uppercase'
            }
          },
          title
        )
      ),
      React.createElement(
        'div',
        {
          style: {
            padding: '22px 26px',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-code)'
          }
        },
        lines.map((line, index) =>
          React.createElement(
            'div',
            {
              key: index,
              style: {
                color: line.dim ? 'var(--text-inverse-muted)' : line.color || '#e8e8ed',
                whiteSpace: 'pre-wrap'
              }
            },
            line.prompt
              ? React.createElement(
                  'span',
                  { style: { color: 'var(--accent-check-inverse)' } },
                  '$ '
                )
              : null,
            line.text
          )
        )
      )
    );
  }

  function CodeBlock({ children, lang }) {
    return React.createElement(
      'pre',
      {
        style: {
          background: 'var(--surface-panel-2)',
          color: '#e8e8ed',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-code)',
          borderRadius: 'var(--radius-md)',
          padding: '22px 26px',
          overflowX: 'auto',
          margin: 0,
          border: '1px solid var(--border-panel)'
        }
      },
      lang
        ? React.createElement(
            'div',
            {
              style: {
                color: 'var(--text-inverse-muted)',
                fontSize: 'var(--text-xs)',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: 'var(--tracking-wider)'
              }
            },
            lang
          )
        : null,
      React.createElement('code', null, children)
    );
  }

  function CommandTable({ rows }) {
    return React.createElement(
      'table',
      {
        style: {
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-base)'
        }
      },
      React.createElement(
        'tbody',
        null,
        rows.map((row, index) =>
          React.createElement(
            'tr',
            { key: index, style: { borderBottom: '1px solid var(--border-default)' } },
            React.createElement(
              'td',
              {
                style: {
                  padding: '16px 28px 16px 0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--accent-check)',
                  whiteSpace: 'nowrap',
                  verticalAlign: 'top'
                }
              },
              row.command
            ),
            React.createElement(
              'td',
              {
                style: {
                  padding: '16px 0',
                  color: 'var(--text-secondary)',
                  lineHeight: 'var(--leading-normal)'
                }
              },
              row.description
            )
          )
        )
      )
    );
  }

  global.XerifyDesignSystem_8cd4a2 = {
    Button,
    Badge,
    Tag,
    VerdictPill,
    Callout,
    Terminal,
    CodeBlock,
    CommandTable
  };
})(globalThis);
