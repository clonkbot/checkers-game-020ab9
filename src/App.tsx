import { useState, useCallback, Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Float, Text } from '@react-three/drei'
import * as THREE from 'three'

type PieceColor = 'red' | 'black'
type PieceType = { color: PieceColor; isKing: boolean } | null

interface GameState {
  board: PieceType[][]
  currentPlayer: PieceColor
  selectedPiece: { row: number; col: number } | null
  validMoves: { row: number; col: number; isCapture: boolean }[]
  capturedRed: number
  capturedBlack: number
  winner: PieceColor | null
}

const initialBoard = (): PieceType[][] => {
  const board: PieceType[][] = Array(8).fill(null).map(() => Array(8).fill(null))

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'black', isKing: false }
      }
    }
  }

  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'red', isKing: false }
      }
    }
  }

  return board
}

function CheckerPiece({
  position,
  color,
  isKing,
  isSelected,
  onClick
}: {
  position: [number, number, number]
  color: PieceColor
  isKing: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const meshRef = useRef<THREE.Group>(null!)
  const baseColor = color === 'red' ? '#8B0000' : '#1a1a1a'
  const accentColor = color === 'red' ? '#CD5C5C' : '#333333'

  return (
    <group
      ref={meshRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      <Float
        speed={isSelected ? 4 : 0}
        rotationIntensity={isSelected ? 0.2 : 0}
        floatIntensity={isSelected ? 0.3 : 0}
      >
        {/* Main piece body */}
        <mesh castShadow position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.35, 0.38, 0.2, 32]} />
          <meshStandardMaterial
            color={baseColor}
            metalness={0.3}
            roughness={0.4}
            emissive={isSelected ? baseColor : '#000000'}
            emissiveIntensity={isSelected ? 0.3 : 0}
          />
        </mesh>

        {/* Top ring accent */}
        <mesh position={[0, 0.21, 0]}>
          <torusGeometry args={[0.25, 0.03, 16, 32]} />
          <meshStandardMaterial
            color={accentColor}
            metalness={0.6}
            roughness={0.2}
          />
        </mesh>

        {/* King crown */}
        {isKing && (
          <group position={[0, 0.35, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.15, 0.2, 0.15, 6]} />
              <meshStandardMaterial
                color="#FFD700"
                metalness={0.8}
                roughness={0.1}
              />
            </mesh>
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <mesh
                key={i}
                position={[
                  Math.cos(angle * Math.PI / 180) * 0.15,
                  0.12,
                  Math.sin(angle * Math.PI / 180) * 0.15
                ]}
              >
                <sphereGeometry args={[0.04, 16, 16]} />
                <meshStandardMaterial
                  color="#FFD700"
                  metalness={0.9}
                  roughness={0.05}
                />
              </mesh>
            ))}
          </group>
        )}
      </Float>
    </group>
  )
}

function BoardSquare({
  position,
  isDark,
  isHighlighted,
  isValidMove,
  isCapture,
  onClick
}: {
  position: [number, number, number]
  isDark: boolean
  isHighlighted: boolean
  isValidMove: boolean
  isCapture: boolean
  onClick: () => void
}) {
  const color = isDark ? '#4a3728' : '#d4b896'

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={isHighlighted ? '#6b8e23' : isValidMove ? (isCapture ? '#ff6b6b' : '#90EE90') : color}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {isValidMove && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.35, 32]} />
          <meshStandardMaterial
            color={isCapture ? '#ff0000' : '#00ff00'}
            transparent
            opacity={0.6}
            emissive={isCapture ? '#ff0000' : '#00ff00'}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    </group>
  )
}

function Board({
  gameState,
  onSquareClick,
  onPieceClick
}: {
  gameState: GameState
  onSquareClick: (row: number, col: number) => void
  onPieceClick: (row: number, col: number) => void
}) {
  return (
    <group>
      {/* Board frame */}
      <mesh position={[0, -0.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[9, 0.3, 9]} />
        <meshStandardMaterial color="#2d1810" metalness={0.2} roughness={0.6} />
      </mesh>

      {/* Decorative corners */}
      {[[-4.2, -4.2], [-4.2, 4.2], [4.2, -4.2], [4.2, 4.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0, z]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#8B4513" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* Board squares */}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const x = col - 3.5
          const z = row - 3.5
          const isDark = (row + col) % 2 === 1
          const isHighlighted = gameState.selectedPiece?.row === row && gameState.selectedPiece?.col === col
          const validMove = gameState.validMoves.find(m => m.row === row && m.col === col)

          return (
            <BoardSquare
              key={`${row}-${col}`}
              position={[x, 0.01, z]}
              isDark={isDark}
              isHighlighted={isHighlighted}
              isValidMove={!!validMove}
              isCapture={validMove?.isCapture || false}
              onClick={() => onSquareClick(row, col)}
            />
          )
        })
      )}

      {/* Pieces */}
      {gameState.board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          if (!piece) return null
          const x = colIndex - 3.5
          const z = rowIndex - 3.5
          const isSelected = gameState.selectedPiece?.row === rowIndex && gameState.selectedPiece?.col === colIndex

          return (
            <CheckerPiece
              key={`piece-${rowIndex}-${colIndex}`}
              position={[x, 0.01, z]}
              color={piece.color}
              isKing={piece.isKing}
              isSelected={isSelected}
              onClick={() => onPieceClick(rowIndex, colIndex)}
            />
          )
        })
      )}
    </group>
  )
}

function CapturedPieces({ count, color, side }: { count: number; color: PieceColor; side: 'left' | 'right' }) {
  const xOffset = side === 'left' ? -6 : 6
  const baseColor = color === 'red' ? '#8B0000' : '#1a1a1a'

  return (
    <group position={[xOffset, 0, 0]}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[0, 0.1 + i * 0.15, (i % 4) - 1.5]} castShadow>
          <cylinderGeometry args={[0.3, 0.32, 0.15, 32]} />
          <meshStandardMaterial color={baseColor} metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function WinnerText({ winner }: { winner: PieceColor }) {
  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
      <Text
        position={[0, 3, 0]}
        fontSize={1}
        color={winner === 'red' ? '#ff4444' : '#333333'}
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/cinzel/v23/8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnfY3lCA.woff2"
      >
        {winner.toUpperCase()} WINS!
      </Text>
    </Float>
  )
}

function Scene({ gameState, onSquareClick, onPieceClick }: {
  gameState: GameState
  onSquareClick: (row: number, col: number) => void
  onPieceClick: (row: number, col: number) => void
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-5, 8, -5]} intensity={0.5} color="#ffeedd" />
      <pointLight position={[5, 8, -5]} intensity={0.3} color="#ddeeff" />

      <Board
        gameState={gameState}
        onSquareClick={onSquareClick}
        onPieceClick={onPieceClick}
      />

      <CapturedPieces count={gameState.capturedBlack} color="black" side="left" />
      <CapturedPieces count={gameState.capturedRed} color="red" side="right" />

      {gameState.winner && <WinnerText winner={gameState.winner} />}

      <ContactShadows
        position={[0, -0.29, 0]}
        opacity={0.6}
        scale={15}
        blur={2.5}
        far={10}
      />

      <Environment preset="apartment" />

      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={18}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  )
}

function App() {
  const [gameState, setGameState] = useState<GameState>({
    board: initialBoard(),
    currentPlayer: 'red',
    selectedPiece: null,
    validMoves: [],
    capturedRed: 0,
    capturedBlack: 0,
    winner: null
  })

  const getValidMoves = useCallback((board: PieceType[][], row: number, col: number, mustCapture = false): { row: number; col: number; isCapture: boolean }[] => {
    const piece = board[row][col]
    if (!piece) return []

    const moves: { row: number; col: number; isCapture: boolean }[] = []
    const directions = piece.isKing
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : piece.color === 'red'
        ? [[-1, -1], [-1, 1]]
        : [[1, -1], [1, 1]]

    // Check for captures
    for (const [dr, dc] of directions) {
      const jumpRow = row + dr * 2
      const jumpCol = col + dc * 2
      const midRow = row + dr
      const midCol = col + dc

      if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
        const midPiece = board[midRow][midCol]
        if (midPiece && midPiece.color !== piece.color && !board[jumpRow][jumpCol]) {
          moves.push({ row: jumpRow, col: jumpCol, isCapture: true })
        }
      }
    }

    // If there are captures available, only return captures
    if (moves.length > 0 || mustCapture) return moves

    // Check for regular moves
    for (const [dr, dc] of directions) {
      const newRow = row + dr
      const newCol = col + dc

      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8 && !board[newRow][newCol]) {
        moves.push({ row: newRow, col: newCol, isCapture: false })
      }
    }

    return moves
  }, [])

  const hasAnyCaptures = useCallback((board: PieceType[][], color: PieceColor): boolean => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (piece && piece.color === color) {
          const moves = getValidMoves(board, row, col, true)
          if (moves.some(m => m.isCapture)) return true
        }
      }
    }
    return false
  }, [getValidMoves])

  const checkWinner = useCallback((board: PieceType[][]): PieceColor | null => {
    let redPieces = 0
    let blackPieces = 0
    let redCanMove = false
    let blackCanMove = false

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (piece) {
          if (piece.color === 'red') {
            redPieces++
            if (getValidMoves(board, row, col).length > 0) redCanMove = true
          } else {
            blackPieces++
            if (getValidMoves(board, row, col).length > 0) blackCanMove = true
          }
        }
      }
    }

    if (redPieces === 0 || !redCanMove) return 'black'
    if (blackPieces === 0 || !blackCanMove) return 'red'
    return null
  }, [getValidMoves])

  const handlePieceClick = useCallback((row: number, col: number) => {
    if (gameState.winner) return

    const piece = gameState.board[row][col]
    if (!piece || piece.color !== gameState.currentPlayer) return

    const playerHasCaptures = hasAnyCaptures(gameState.board, gameState.currentPlayer)
    let validMoves = getValidMoves(gameState.board, row, col)

    if (playerHasCaptures) {
      validMoves = validMoves.filter(m => m.isCapture)
    }

    if (validMoves.length === 0 && playerHasCaptures) {
      return
    }

    setGameState(prev => ({
      ...prev,
      selectedPiece: { row, col },
      validMoves
    }))
  }, [gameState.board, gameState.currentPlayer, gameState.winner, getValidMoves, hasAnyCaptures])

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameState.winner) return
    if (!gameState.selectedPiece) return

    const move = gameState.validMoves.find(m => m.row === row && m.col === col)
    if (!move) {
      setGameState(prev => ({ ...prev, selectedPiece: null, validMoves: [] }))
      return
    }

    const newBoard = gameState.board.map(r => [...r])
    const piece = newBoard[gameState.selectedPiece.row][gameState.selectedPiece.col]!

    newBoard[gameState.selectedPiece.row][gameState.selectedPiece.col] = null
    newBoard[row][col] = piece

    let newCapturedRed = gameState.capturedRed
    let newCapturedBlack = gameState.capturedBlack

    if (move.isCapture) {
      const midRow = (gameState.selectedPiece.row + row) / 2
      const midCol = (gameState.selectedPiece.col + col) / 2
      const capturedPiece = newBoard[midRow][midCol]!
      newBoard[midRow][midCol] = null

      if (capturedPiece.color === 'red') newCapturedRed++
      else newCapturedBlack++
    }

    // Check for king promotion
    if ((piece.color === 'red' && row === 0) || (piece.color === 'black' && row === 7)) {
      newBoard[row][col] = { ...piece, isKing: true }
    }

    // Check for additional captures
    if (move.isCapture) {
      const additionalCaptures = getValidMoves(newBoard, row, col, true).filter(m => m.isCapture)
      if (additionalCaptures.length > 0) {
        setGameState(prev => ({
          ...prev,
          board: newBoard,
          selectedPiece: { row, col },
          validMoves: additionalCaptures,
          capturedRed: newCapturedRed,
          capturedBlack: newCapturedBlack
        }))
        return
      }
    }

    const winner = checkWinner(newBoard)
    const nextPlayer = gameState.currentPlayer === 'red' ? 'black' : 'red'

    setGameState({
      board: newBoard,
      currentPlayer: nextPlayer,
      selectedPiece: null,
      validMoves: [],
      capturedRed: newCapturedRed,
      capturedBlack: newCapturedBlack,
      winner
    })
  }, [gameState, getValidMoves, checkWinner])

  const resetGame = useCallback(() => {
    setGameState({
      board: initialBoard(),
      currentPlayer: 'red',
      selectedPiece: null,
      validMoves: [],
      capturedRed: 0,
      capturedBlack: 0,
      winner: null
    })
  }, [])

  return (
    <div className="relative w-screen h-screen bg-gradient-to-br from-[#1a0f0a] via-[#2d1810] to-[#0d0705] overflow-hidden">
      {/* Ambient texture overlay */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          <h1
            className="text-2xl md:text-4xl tracking-[0.3em] text-amber-100/90"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            CHECKERS
          </h1>

          <div className="flex items-center gap-4 md:gap-8">
            {/* Score display */}
            <div className="flex items-center gap-3 md:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#8B0000] border-2 border-amber-100/30" />
                <span className="text-amber-100/80 text-sm md:text-base font-light" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {12 - gameState.capturedRed}
                </span>
              </div>
              <span className="text-amber-100/40">vs</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-[#1a1a1a] border-2 border-amber-100/30" />
                <span className="text-amber-100/80 text-sm md:text-base font-light" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  {12 - gameState.capturedBlack}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Turn indicator */}
      <div className="absolute top-20 md:top-24 left-1/2 -translate-x-1/2 z-10">
        <div
          className="px-4 md:px-6 py-2 md:py-3 rounded-full backdrop-blur-md border transition-all duration-500"
          style={{
            backgroundColor: gameState.currentPlayer === 'red' ? 'rgba(139, 0, 0, 0.3)' : 'rgba(26, 26, 26, 0.5)',
            borderColor: gameState.currentPlayer === 'red' ? 'rgba(220, 100, 100, 0.4)' : 'rgba(100, 100, 100, 0.4)'
          }}
        >
          <span
            className="text-xs md:text-sm tracking-[0.2em] text-amber-100/80"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            {gameState.winner ? 'GAME OVER' : `${gameState.currentPlayer.toUpperCase()}'S TURN`}
          </span>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 10, 10], fov: 50 }}
        className="!absolute inset-0"
      >
        <Suspense fallback={null}>
          <Scene
            gameState={gameState}
            onSquareClick={handleSquareClick}
            onPieceClick={handlePieceClick}
          />
        </Suspense>
      </Canvas>

      {/* Reset button */}
      <button
        onClick={resetGame}
        className="absolute bottom-20 md:bottom-16 left-1/2 -translate-x-1/2 z-10 px-6 md:px-8 py-3 md:py-4 bg-amber-900/30 hover:bg-amber-800/40 border border-amber-100/20 hover:border-amber-100/40 rounded-full backdrop-blur-md transition-all duration-300 group"
      >
        <span
          className="text-xs md:text-sm tracking-[0.25em] text-amber-100/70 group-hover:text-amber-100 transition-colors"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          NEW GAME
        </span>
      </button>

      {/* Instructions tooltip */}
      <div className="absolute bottom-32 md:bottom-28 left-1/2 -translate-x-1/2 z-10 text-center px-4">
        <p
          className="text-xs text-amber-100/40 max-w-xs"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Click a piece to select, then click a highlighted square to move. Drag to rotate the board.
        </p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 md:bottom-6 left-0 right-0 z-10 text-center">
        <p
          className="text-[10px] md:text-xs text-amber-100/30 tracking-wider"
          style={{ fontFamily: 'Cormorant Garamond, serif' }}
        >
          Requested by @web-user · Built by @clonkbot
        </p>
      </footer>
    </div>
  )
}

export default App
