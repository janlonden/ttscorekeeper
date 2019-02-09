const {
  any,
  all,
  and,
  append,
  both,
  cond,
  dropLast,
  either,
  gte,
  identical,
  last,
  length,
  modulo,
  nth,
  o,
  prop,
  sum,
  __
} = R

const { Subject, fromEvent, operators } = rxjs
const { startWith, scan, map, throttleTime, tap, shareReplay } = operators
const player1 = document.querySelector('.player-1')
const player1Score = player1.querySelector('.score')
const player1SetScore = player1.querySelector('.set-score')
const player1Server = player1.querySelector('.server')
const player2 = document.querySelector('.player-2')
const player2Score = player2.querySelector('.score')
const player2SetScore = player2.querySelector('.set-score')
const player2Server = player2.querySelector('.server')
const resetButton = document.querySelector('.reset-button')
const undoButton = document.querySelector('.undo-button')

const announce = what => {
  const announcement = new SpeechSynthesisUtterance(what)
  const voices = speechSynthesis.getVoices()

  announcement.voice = nth(1, voices)
  announcement.rate = 0.8

  speechSynthesis.cancel()
  speechSynthesis.speak(announcement)
}

// state

const storeSubject = new Subject()
const someoneHas11OrMore = any(gte(__, 11))
const bothScoresAre10OrMore = all(gte(__, 10))

const combinedScoreIsAtLeast2AndEven = o(
  both(gte(__, 2), o(identical(0), modulo(__, 2))),
  sum
)

const shouldChangeServer = either(
  combinedScoreIsAtLeast2AndEven,
  bothScoresAre10OrMore
)

const createNewState = (
  player,
  {
    player1Score,
    player1SetScore,
    player2Score,
    player2SetScore,
    server,
    setServer
  }
) => {
  const isPlayer1 = identical(player, 1)
  const newPlayer1Score = player1Score + 1
  const newPlayer2Score = player2Score + 1

  const scores = [
    isPlayer1 ? newPlayer1Score : player1Score,
    isPlayer1 ? player2Score : newPlayer2Score
  ]

  const newSetServer = identical(setServer, 1) ? 2 : 1

  const newServer = shouldChangeServer(scores)
    ? identical(server, 1) ? 2 : 1
    : server

  const someoneLeadsWith2 = isPlayer1
    ? newPlayer1Score - 2 >= player2Score
    : newPlayer2Score - 2 >= player1Score

  const someoneWon = and(someoneHas11OrMore(scores), someoneLeadsWith2)
  const player1Won = newPlayer1Score > newPlayer2Score

  announce(
    someoneWon
      ? `${player1Won ? 'red' : 'blue'} wins the set ... ${
        identical(newSetServer, 1) ? 'red' : 'blue'
      } serves`
      : `${
        isPlayer1
          ? identical(newServer, 1) ? newPlayer1Score : player2Score
          : identical(newServer, 1) ? player1Score : newPlayer2Score
      } ${
        isPlayer1
          ? identical(newServer, 1) ? player2Score : newPlayer1Score
          : identical(newServer, 1) ? newPlayer2Score : player1Score
      } ... ${identical(newServer, 1) ? 'red' : 'blue'} serves`
  )

  return {
    player1Score: someoneWon ? 0 : isPlayer1 ? newPlayer1Score : player1Score,

    player1SetScore: someoneWon
      ? player1Won ? player1SetScore + 1 : player1SetScore
      : player1SetScore,

    player2Score: someoneWon ? 0 : isPlayer1 ? player2Score : newPlayer2Score,

    player2SetScore: someoneWon
      ? player1Won ? player2SetScore : player2SetScore + 1
      : player2SetScore,

    server: someoneWon ? newSetServer : newServer,
    setServer: someoneWon ? newSetServer : setServer
  }
}

const createInitialState = () => {
  const server = Math.floor(Math.random() * 2) + 1

  return [
    {
      player1Score: 0,
      player1SetScore: 0,
      player2Score: 0,
      player2SetScore: 0,
      server,
      setServer: server
    }
  ]
}

const store = storeSubject.pipe(
  startWith(createInitialState()),
  throttleTime(250),

  scan((state, type) => {
    const newState = cond([
      [
        identical('player 1 scores'),
        () => append(createNewState(1, last(state)), state)
      ],

      [
        identical('player 2 scores'),
        () => append(createNewState(2, last(state)), state)
      ],

      [identical('reset'), () => append(last(createInitialState()), state)],

      [
        identical('undo'),
        () => (length(state) >= 2 ? dropLast(1, state) : state)
      ]
    ])(type)

    console.log('\n')

    console.log(
      `%c${type}`,
      'color: #222; background-color: #fff0d3; font-weight: 700; padding: 0.5rem'
    )

    console.table({ prevState: last(state), nextState: last(newState) })

    return newState
  }),

  map(last),
  shareReplay(1)
)

// renderers

store.subscribe(({ player1Score: score }) => (player1Score.innerHTML = score))

store.subscribe(
  ({ player1SetScore: score }) => (player1SetScore.innerHTML = score)
)

store.subscribe(({ player2Score: score }) => (player2Score.innerHTML = score))

store.subscribe(
  ({ player2SetScore: score }) => (player2SetScore.innerHTML = score)
)

store.subscribe(
  ({ server }) =>
    identical(1, server)
      ? (player2Server.classList.remove('current'),
        player1Server.classList.add('current'))
      : (player1Server.classList.remove('current'),
        player2Server.classList.add('current'))
)

// click listeners

fromEvent(player1, 'click').subscribe(() =>
  storeSubject.next('player 1 scores')
)

fromEvent(player2, 'click').subscribe(() =>
  storeSubject.next('player 2 scores')
)

fromEvent(resetButton, 'click').subscribe(() => storeSubject.next('reset'))
fromEvent(undoButton, 'click').subscribe(() => storeSubject.next('undo'))

// pwa

navigator.serviceWorker &&
  window.addEventListener('load', () =>
    navigator.serviceWorker
      .register('/ttscorekeeper/sw.js')
      .then(() => {}, () => {})
  )
