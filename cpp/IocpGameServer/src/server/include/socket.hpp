#pragma once
#include <WinSock2.h>
#include <mutex>
#include <queue>
#include <iostream>
#include <memory>
#include <condition_variable>
#include "packet_message.hpp"

namespace IocpGameServer {
	// 헤더 의존성 제거
	class Application;
	class User;

	// IOCP 네트워크 처리용 Socket 클래스
	// 클라이언트 연결 요청 시 accept 하면서 생성
	// IOCP Completion Key로 사용
	class Socket : public std::enable_shared_from_this<Socket> {
	public:
		// 메시지 버퍼 체크 주기(밀리초)
		static const int kHandlePeriod = 10;

		// 소켓 삭제 대기 시간(초)
		static const int kDeadLimit = 10;

		// No action 최대 대기 시간(초)
		static const int kMaximumNoActionTimeSeconds = 1800;

	private:
		Application& app_;

		// 클라이언트 소켓 아이디
		const SOCKET socket_id_;

		// 클라이언트 주소
		const SOCKADDR_IN addr_;

		// 패킷 메시지 버퍼
		// 버퍼에 패킷 메시지들을 쌓고, 일정 주기로 버퍼를 비우면서
		// 메시지들을 하나의 데이터로 합쳐서 한번에 클라이언트에 전송한다.
		std::queue<std::unique_ptr<PacketMessage>> packet_buffer_;

		// 패킷 메시지 버퍼 락
		std::mutex buffer_lock_;


		// 일정 시간 동안 받은 패킷의 수
		// 특정 값을 초과할 경우 서버에서 연결을 강제로 끊는다
		int packet_count_ = 0;
		std::mutex packet_count_lock_;
		// 패킷 카운트 처리용 condition_variable
		// 대기중 패킷을 받으면 notify를 받고 일정 주기로 카운트를 감소시킨다.
		std::mutex too_many_packets_timer_lock_;
		std::condition_variable too_many_packets_timer_;

		// 일정 시간 동안 패킷을 전송하지 않는 클라이언트 처리용 condition_variable
		// 대기중 패킷을 받으면 notify를 받고 처음부터 다시 대기한다.
		// 패킷을 계속 받지 못하고 timeout되면 강제로 연결을 끊는다.
		std::mutex no_action_timer_lock_;
		std::condition_variable no_action_timer_;

		// 소켓 연결 종료 시 true로 변경해서 소켓 관련 스레드들이 종료될 수 있도록 하는 플래그
		bool is_disconnected_ = false;

		// 소켓에 종속되어있는 유저
		std::shared_ptr<User> user_ = nullptr;

		explicit Socket(const SOCKET socket_id, const SOCKADDR_IN addr, Application& app) : socket_id_(socket_id), addr_(addr), app_(app) {}

		// 복사 방지
		Socket(Socket&) = delete;
		Socket(Socket&&) = delete;
		Socket& operator=(const Socket& rhs) = delete;

	public:
		// 소켓 객체 생성 함수
		// parameter socket_id를 갖는 소켓 객체를 만든다.
		// 이미 socket_id에 대한 소켓이 생성되어 있을 경우 해당 객체를 반환한다.
		static std::shared_ptr<Socket> CreateSocket(const SOCKET socket_id, const SOCKADDR_IN addr, Application& app);

		~Socket() { std::cout << "socket dtor called" << std::endl; }

		// 핸들러 스레드
		// 특정 시간마다 버퍼를 체크하고 버퍼에 메시지가 있으면
		// 버퍼에 있는 모든 메시지를 하나의 데이터로 합치고 버퍼를 비운다.
		// 합친 데이터는 클라이언트로 전송한다.
		static DWORD SocketHandler(std::shared_ptr<Socket> socket);

		// 패킷 카운트 감산기 타이머 스레드
		static DWORD DecrementPacketCount(std::shared_ptr<Socket> socket);
		const int IncrementPacketCount() { if (++packet_count_ == 1) too_many_packets_timer_.notify_all(); return packet_count_; }

		// 클라이언트로부터 마지막 메시지를 받은 후 일정 시간이 경과하면
		// 강제로 연결을 끊는 타이머 스레드
		static DWORD CheckNoAction(std::shared_ptr<Socket> socket);

		// 서버에서 강제로 연결을 끊는 함수
		// 함수 호출 시 EOF 전송
		void ForceDisconnect() { closesocket(socket_id_); is_disconnected_ = true; }
		const bool IsDisconnected() const { return is_disconnected_; }
		void Disconnect(const bool force = true);

		// No action 타이머를 초기화 하는 함수
		void NotifyNoActionTimer();

		// user getter
		std::shared_ptr<User> GetUser() const { return user_; }
		// user setter
		void SetUser(std::shared_ptr<User> user) { user_.swap(user); }

		// send 함수
		// message_buffer에 메시지를 추가
		void Send(const unsigned int protocol, const std::string& data);
		void Send(const unsigned int protocol);

		void Receive() const;


		Application& GetApp() { return app_; }
	};

} //namespace IocpGameServer