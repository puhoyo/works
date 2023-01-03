#include "include/socket.hpp"
#include "include/packet.hpp"
#include "../app/application.hpp"
#include "../app/apis/include/error.hpp"
#include "../app/lib/include/user.hpp"
#include <chrono>
#include <thread>
using namespace std::chrono_literals;

namespace IocpGameServer {
	const int Socket::kMaximumNoActionTimeSeconds;
	
	std::shared_ptr<Socket> Socket::CreateSocket(const SOCKET socket_id, const SOCKADDR_IN addr, Application& app) {
		auto socket = app.GetSocket(socket_id);
		if (socket == nullptr) {
			socket.reset(new Socket(socket_id, addr, app));
			//socket = std::shared_ptr<Socket>(socket, addr);
			//Share the ownership of user with appliaction by adding user to user pool
			app.AddSocket(socket_id, socket);

			std::thread t1(Socket::SocketHandler, socket);
			t1.detach();
			std::thread t2(Socket::DecrementPacketCount, socket);
			t2.detach();
			std::thread t3(Socket::CheckNoAction, socket);
			t3.detach();
		}

		return socket;
	}

	void Socket::NotifyNoActionTimer() {
		no_action_timer_.notify_all();
	}

	DWORD Socket::SocketHandler(std::shared_ptr<Socket> socket) {
		while (true) {
			Sleep(kHandlePeriod);
			if (socket->is_disconnected_) break;

			std::string data;
			{
				std::scoped_lock lock(socket->buffer_lock_);
				while (!socket->packet_buffer_.empty()) {
					//data += "$&";
					auto packet_message = std::move(socket->packet_buffer_.front());
					socket->packet_buffer_.pop();
					data += packet_message->kProtocol;
					data += packet_message->data;
				}
			}

			if (!data.empty()) {
				// send message

				// packet will be deleted on IO completion handler
				Packet* packet = new Packet(data);
				WSASend(socket->socket_id_, packet->GetBufferAddress(), 1, NULL, 0, reinterpret_cast<LPWSAOVERLAPPED>(packet), NULL);
			}
		}
		Sleep(kDeadLimit * 1000);
		socket->GetApp().Console("SocketHandler done");

		return 0;
	}

	DWORD Socket::DecrementPacketCount(std::shared_ptr<Socket> socket) {
		while (!socket->is_disconnected_) {
			if (socket->packet_count_ > 0) {
				std::scoped_lock lock(socket->packet_count_lock_);
				socket->packet_count_--;
			}
			else {
				// scoped_lock 사용 시 condition_variable 사용이 불가능한 문제가 있으므로 unique_lock 사용
				std::unique_lock lock(socket->too_many_packets_timer_lock_);
				socket->too_many_packets_timer_.wait(lock);
			}
			Sleep(1000);
		}
		socket->GetApp().Console("DecrementPacketCounter done");

		return 0;
	}
	DWORD Socket::CheckNoAction(std::shared_ptr<Socket> socket) {
		while (!socket->is_disconnected_) {
			// scoped_lock 사용 시 condition_variable 사용이 불가능한 문제가 있으므로 unique_lock 사용
			std::unique_lock lock(socket->no_action_timer_lock_);
			auto timeout = socket->no_action_timer_.wait_for(lock, kMaximumNoActionTimeSeconds * 1000ms);
			if (timeout == std::cv_status::timeout) {
				// user didn't any actions too long
				socket->Disconnect();
			}
		}
		socket->GetApp().Console("CheckNoAction done");

		return 0;
	}

	void Socket::Send(const unsigned int protocol, const std::string& data) {
		std::scoped_lock lock(buffer_lock_);
		packet_buffer_.push(std::make_unique<PacketMessage>(protocol, data));
	}
	void Socket::Send(const unsigned int protocol) {
		std::scoped_lock lock(buffer_lock_);
		packet_buffer_.push(std::make_unique<PacketMessage>(protocol));
	}

	void Socket::Disconnect(const bool force) {
		is_disconnected_ = true;
		shutdown(socket_id_, SD_BOTH);

		too_many_packets_timer_.notify_all();
		no_action_timer_.notify_all();

		app_.DeleteSocket(socket_id_);

		closesocket(socket_id_);
	}

	void Socket::Receive() const {
		DWORD flags = 0;

		auto packet = new Packet();
		WSARecv(socket_id_, packet->GetBufferAddress(), 1, NULL, &flags, reinterpret_cast<LPWSAOVERLAPPED>(packet), NULL);
	}

} //namespace IocpGameServer